#include "Game.hpp"
#include <algorithm>
#include <cmath>
#include <cstdlib>

static constexpr float PI = 3.14159265f;

namespace NC {

Game::Game() { reset(); }

void Game::reset() {
  blue = {40.f, -100.f, 1000, 1000, Faction::BLUE, "BLUE", "Washington"};
  red = {40.f, 116.f, 1000, 1000, Faction::RED, "RED", "Beijing"};
  phase = GamePhase::PLAYING;
  currentTurn = Faction::BLUE;
  winnerText = "";
  missiles.clear();
  explosions.clear();
}

int Game::calcDamage(float hitLat, float hitLon, float baseLat, float baseLon) {
  float rad = PI / 180.f;
  float dLat = (hitLat - baseLat) * rad;
  float dLon = (hitLon - baseLon) * rad;
  float a = std::sin(dLat / 2) * std::sin(dLat / 2) +
            std::cos(baseLat * rad) * std::cos(hitLat * rad) *
                std::sin(dLon / 2) * std::sin(dLon / 2);
  float dist = 2.f * std::atan2(std::sqrt(a), std::sqrt(1 - a)); // radians
  // Max damage 450 at direct hit, falls off over ~90 degrees (1.57 rad)
  float dmg = 450.f * std::max(0.f, 1.f - dist / 1.57f);
  dmg += (float)(rand() % 60 - 30);
  return (int)std::max(10.f, dmg);
}

void Game::applyDamage(Faction target, int dmg) {
  if (target == Faction::BLUE)
    blue.hp = std::max(0, blue.hp - dmg);
  else
    red.hp = std::max(0, red.hp - dmg);

  if (blue.hp <= 0) {
    phase = GamePhase::GAME_OVER;
    winnerText = "FACTION RED VICTORIOUS";
  } else if (red.hp <= 0) {
    phase = GamePhase::GAME_OVER;
    winnerText = "FACTION BLUE VICTORIOUS";
  }
}

int Game::fireMissile(float targetLat, float targetLon) {
  if (phase != GamePhase::PLAYING)
    return -1;

  Missile m;
  m.progress = 0.f;
  m.owner = currentTurn;
  if (currentTurn == Faction::BLUE) {
    m.startLat = blue.lat;
    m.startLon = blue.lon;
  } else {
    m.startLat = red.lat;
    m.startLon = red.lon;
  }
  m.endLat = targetLat;
  m.endLon = targetLon;
  missiles.push_back(m);
  phase = GamePhase::ANIMATING;
  return 0;
}

void Game::update(float dt) {
  // Update missiles
  bool anyActive = false;
  for (auto &m : missiles) {
    if (!m.active)
      continue;
    m.progress += dt * 0.4f;
    if (m.progress >= 1.f) {
      m.active = false;
      // Spawn explosion
      Explosion ex;
      ex.lat = m.endLat;
      ex.lon = m.endLon;
      ex.life = 1.f;
      ex.maxRadius = 8.f;
      ex.owner = m.owner;
      explosions.push_back(ex);
      // Damage enemy
      Faction enemy = (m.owner == Faction::BLUE) ? Faction::RED : Faction::BLUE;
      float bLat = (enemy == Faction::BLUE) ? blue.lat : red.lat;
      float bLon = (enemy == Faction::BLUE) ? blue.lon : red.lon;
      int dmg = calcDamage(m.endLat, m.endLon, bLat, bLon);
      applyDamage(enemy, dmg);
    } else {
      anyActive = true;
    }
  }
  // Remove dead missiles
  missiles.erase(std::remove_if(missiles.begin(), missiles.end(),
                                [](const Missile &m) { return !m.active; }),
                 missiles.end());

  // Update explosions
  for (auto &ex : explosions)
    ex.life -= dt * 0.6f;
  explosions.erase(
      std::remove_if(explosions.begin(), explosions.end(),
                     [](const Explosion &e) { return e.life <= 0; }),
      explosions.end());

  // Transition back to playing when all done
  if (phase == GamePhase::ANIMATING && missiles.empty() && explosions.empty()) {
    if (blue.hp > 0 && red.hp > 0) {
      currentTurn =
          (currentTurn == Faction::BLUE) ? Faction::RED : Faction::BLUE;
      phase = GamePhase::PLAYING;
    }
  }
}

} // namespace NC
