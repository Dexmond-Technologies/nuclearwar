import json
import os
import time
from statistics import stdev
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables, primarily for DATABASE_URL
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        return None
    try:
        url = urlparse(DATABASE_URL)
        conn = psycopg2.connect(
            dbname=url.path[1:],
            user=url.username,
            password=url.password,
            host=url.hostname,
            port=url.port,
            sslmode='require' if 'onrender.com' in url.hostname else 'prefer'
        )
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def fetch_data():
    conn = get_db_connection()
    if not conn:
        return None

    try:
        cur = conn.cursor()

        # 1. Token Supply
        cur.execute("SELECT SUM(d3x_balance) FROM commanders;")
        token_supply_row = cur.fetchone()
        token_supply = float(token_supply_row[0] or 0)

        # 2. Reserves (Treasury + World Bank)
        cur.execute("SELECT SUM(d3x_balance) FROM commanders WHERE callsign IN ('TREASURY', 'WORLD BANK');")
        reserves_row = cur.fetchone()
        reserves = float(reserves_row[0] or 0)

        # 3. Transactions (Volume of internal D3X flow, e.g., spends, reinjections, ignoring burns maybe? We'll just sum all flow_type amounts for velocity)
        # We can split history into 3 intervals: 0-24h, 24h-48h, 48h-72h ago
        transactions_history = []
        for i in range(3):
            cur.execute(f"""
                SELECT COALESCE(SUM(amount), 0) FROM token_ledger 
                WHERE created_at >= NOW() - INTERVAL '{24 * (i + 1)} hours' 
                AND created_at < NOW() - INTERVAL '{24 * i} hours'
            """)
            amt = float(cur.fetchone()[0] or 0)
            transactions_history.insert(0, amt) # oldest first

        # 4. Rewards Given (reinjection + d3x_mining + pool_withdraw + pool_join ?) 
        # For simplicity, rewards = reinjection + d3x_mining in the last 24h
        cur.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM token_ledger 
            WHERE flow_type IN ('reinjection', 'd3x_mining') 
            AND created_at >= NOW() - INTERVAL '24 hours'
        """)
        rewards_given = float(cur.fetchone()[0] or 0)

        # 5. Penalties Taken (burn + craft + spend + treasury_fee)
        cur.execute("""
            SELECT COALESCE(SUM(amount), 0) FROM token_ledger 
            WHERE flow_type IN ('burn', 'craft', 'spend', 'treasury_fee') 
            AND created_at >= NOW() - INTERVAL '24 hours'
        """)
        penalties_taken = float(cur.fetchone()[0] or 0)

        cur.close()
        conn.close()

        return {
            "token_supply": token_supply,
            "reserves": reserves,
            "transactions_history": transactions_history,
            "rewards_given": rewards_given,
            "penalties_taken": penalties_taken
        }
    except Exception as e:
        print(f"Error fetching data: {e}")
        if conn:
            conn.close()
        return None

def generate_report():
    data = fetch_data()
    
    # Defaults in case of DB failure or empty DB
    token_supply = 1_000_000
    reserves = 500_000
    transactions_history = [0, 0, 0]
    rewards_given = 0
    penalties_taken = 0
    
    if data:
        token_supply = data["token_supply"] if data["token_supply"] > 0 else 1 # Prevent div/0
        reserves = data["reserves"]
        transactions_history = data["transactions_history"]
        rewards_given = data["rewards_given"]
        penalties_taken = data["penalties_taken"]
        
    target_velocity = 0.02 # Example target velocity
    liquidity_threshold = 0.4
    
    # ---------------------------------------------------------
    # Metrics Calculation
    # ---------------------------------------------------------
    transactions_live = transactions_history[-1]
    
    token_velocity = transactions_live / token_supply
    liquidity_ratio = reserves / token_supply
    reward_penalty_ratio = rewards_given / max(penalties_taken, 1.0)
    
    # Historical volatility
    all_velocity = [interval / token_supply for interval in transactions_history]
    historical_volatility = stdev(all_velocity) if len(all_velocity) > 1 else 0.0

    # ---------------------------------------------------------
    # Stability Index Calculation
    # ---------------------------------------------------------
    stability_index = 0.5 * min(liquidity_ratio, 1.0) + \
                      0.3 * max(0, 1 - abs(token_velocity - target_velocity)) + \
                      0.2 * min(reward_penalty_ratio, 1.0)
                      
    if historical_volatility > 0.05:
        stability_index *= 0.9

    # ---------------------------------------------------------
    # Connectivity Status
    # ---------------------------------------------------------
    db_connected = "connected" if data is not None else "disconnected"
    connectivity = {
        "database": db_connected,
        "wallet": "connected" if db_connected == "connected" else "unknown",
        "reward_system": "connected" if db_connected == "connected" else "unknown",
        "mining_system": "connected" if db_connected == "connected" else "unknown",
        "marketplace": "connected" if db_connected == "connected" else "unknown"
    }

    # ---------------------------------------------------------
    # Recommendations Engine
    # ---------------------------------------------------------
    recommendations = []
    if db_connected == "disconnected":
        recommendations.append("CRITICAL: Database connection failed. Verify PostgreSQL availability.")
    else:
        if liquidity_ratio < liquidity_threshold:
            recommendations.append(f"Liquidity ({liquidity_ratio:.2f}) below threshold ({liquidity_threshold}); consider injecting reserves.")
        if abs(token_velocity - target_velocity) > 0.01:
            recommendations.append(f"Token velocity ({token_velocity:.3f}) deviates from target ({target_velocity}); monitor transactions.")
        if reward_penalty_ratio > 1.5:
            recommendations.append(f"Reward/Penalty ratio ({reward_penalty_ratio:.2f}) high; adjust distribution.")
        if historical_volatility > 0.05:
            recommendations.append(f"Historical volatility ({historical_volatility:.3f}) is high; stability index penalized.")
        
        if not recommendations:
            recommendations.append("Economy is stable. No immediate actions required.")

    # ---------------------------------------------------------
    # JSON Report Generation
    # ---------------------------------------------------------
    report = {
        "timestamp": int(time.time()),
        "connectivity": connectivity,
        "metrics": {
            "token_supply": round(token_supply, 2),
            "reserves": round(reserves, 2),
            "liquidity_ratio": round(liquidity_ratio, 4),
            "token_velocity": round(token_velocity, 4),
            "reward_penalty_ratio": round(reward_penalty_ratio, 4),
            "historical_volatility": round(historical_volatility, 4),
            "transactions_history_24h_windows": [round(x, 2) for x in transactions_history]
        },
        "stability_index": round(stability_index, 3),
        "recommendations": recommendations
    }

    return json.dumps(report, indent=2)

if __name__ == "__main__":
    report_json = generate_report()
    print(report_json)
