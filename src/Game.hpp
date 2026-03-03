#pragma once
#include <functional>
#include <string>
#include <vector>

namespace NC {

enum class Faction { BLUE, RED };
enum class GamePhase { MENU, PLAYING, ANIMATING, GAME_OVER };

struct Base {
  float lat, lon;
  int hp, maxHp;
  Faction faction;
  std::string name;
  std::string city;
};

struct Missile {
  float startLat, startLon;
  float endLat, endLon;
  float progress; // 0 -> 1
  Faction owner;
  bool active = true;
};

struct Explosion {
  float lat, lon;
  float life; // 1.0 -> 0
  float maxRadius;
  Faction owner;
};

class Game {
public:
  Game();
  void reset();

  // Returns damage dealt, or -1 if invalid
  int fireMissile(float targetLat, float targetLon);

  Base blue;
  Base red;
  GamePhase phase;
  Faction currentTurn;
  std::string winnerText;

  std::vector<Missile> missiles;
  std::vector<Explosion> explosions;

  void update(float dt);

private:
  int calcDamage(float hitLat, float hitLon, float baseLat, float baseLon);
  void applyDamage(Faction target, int dmg);
};

} // namespace NC
