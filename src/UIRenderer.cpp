#include "UIRenderer.hpp"
#include <cmath>
#include <sstream>

// Try to load a system font
static const char *FONT_PATHS[] = {
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", nullptr};

UIRenderer::UIRenderer(sf::RenderWindow &win) : window(win) {
  for (int i = 0; FONT_PATHS[i]; i++) {
    if (font.loadFromFile(FONT_PATHS[i])) {
      fontLoaded = true;
      break;
    }
  }
}

void UIRenderer::drawGlowText(const std::string &text, float x, float y,
                              unsigned sz, sf::Color col, bool centered) {
  if (!fontLoaded)
    return;
  sf::Text t;
  t.setFont(font);
  t.setString(text);
  t.setCharacterSize(sz);
  if (centered) {
    auto b = t.getLocalBounds();
    t.setOrigin(b.width / 2.f, b.height / 2.f);
  }
  t.setPosition(x, y);

  // Glow: draw slightly offset copies in translucent color
  sf::Color glowCol = col;
  for (int g = 3; g >= 0; g--) {
    float off = (float)g * 1.5f;
    glowCol.a = (g == 0) ? 255 : (unsigned char)(180 / (g + 1));
    sf::Color drawCol = (g == 0) ? col : glowCol;
    t.setFillColor(drawCol);
    for (int dy = -1; dy <= 1; dy++)
      for (int dx = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0)
          continue;
        t.move(dx * off, dy * off);
        window.draw(t);
        t.move(-dx * off, -dy * off);
      }
  }
  t.setFillColor(col);
  window.draw(t);
}

void UIRenderer::drawHPBar(float x, float y, float w, float h, float pct,
                           sf::Color fgCol, sf::Color bgCol,
                           const std::string &label, int hp, int maxHp) {
  // Background track
  sf::RectangleShape bg({w, h});
  bg.setPosition(x, y);
  bg.setFillColor(sf::Color(10, 12, 22, 200));
  bg.setOutlineColor(sf::Color(80, 90, 110, 120));
  bg.setOutlineThickness(1.f);
  window.draw(bg);

  // Glow under bar
  sf::RectangleShape glowBar({w * pct, h});
  glowBar.setPosition(x, y);
  sf::Color glowFg = fgCol;
  glowFg.a = 60;
  glowBar.setFillColor(glowFg);
  window.draw(glowBar);

  // Actual bar
  sf::RectangleShape bar({w * pct - 2.f, h - 4.f});
  bar.setPosition(x + 1.f, y + 2.f);
  bar.setFillColor(fgCol);
  window.draw(bar);

  // Label
  if (!fontLoaded)
    return;
  std::ostringstream ss;
  ss << hp << " / " << maxHp << " HP";
  drawGlowText(label, x, y - 28.f, 18, fgCol);
  drawGlowText(ss.str(), x + w - 130.f, y - 26.f, 15,
               sf::Color(200, 220, 255, 200));
}

void UIRenderer::drawHUD(const NC::Game &game, float time) {
  float W = (float)window.getSize().x;
  float H = (float)window.getSize().y;

  // ---- Top bar background ----
  sf::RectangleShape topBar({W, 80.f});
  topBar.setFillColor(sf::Color(3, 5, 14, 180));
  topBar.setOutlineColor(sf::Color(30, 50, 80, 100));
  topBar.setOutlineThickness(1.f);
  window.draw(topBar);

  // ---- Bottom bar background ----
  sf::RectangleShape botBar({W, 50.f});
  botBar.setPosition(0.f, H - 50.f);
  botBar.setFillColor(sf::Color(3, 5, 14, 180));
  window.draw(botBar);

  // ---- Title ----
  float pulse = 0.5f + 0.5f * std::sin(time * 2.5f);
  sf::Color titleCol(200 + (int)(55 * pulse), 230, 255, 255);
  drawGlowText("NUCLEAR CONFLICT", W / 2.f, 8.f, 28, titleCol, true);

  // ---- Blue HP Bar ----
  sf::Color blueCol(0, 200, 255, 240);
  float bPct = (float)game.blue.hp / game.blue.maxHp;
  drawHPBar(20.f, 42.f, 280.f, 22.f, bPct, blueCol, sf::Color(0, 50, 100),
            "FACTION BLUE — " + game.blue.city, game.blue.hp, game.blue.maxHp);

  // ---- Red HP Bar ----
  sf::Color redCol(255, 30, 60, 240);
  float rPct = (float)game.red.hp / game.red.maxHp;
  drawHPBar(W - 300.f, 42.f, 280.f, 22.f, rPct, redCol, sf::Color(100, 10, 20),
            "FACTION RED — " + game.red.city, game.red.hp, game.red.maxHp);

  // ---- Turn indicator ----
  bool isBlue = (game.currentTurn == NC::Faction::BLUE);
  sf::Color turnCol = isBlue ? blueCol : redCol;
  std::string turnText = isBlue ? "▲ BLUE COMMAND — LAUNCH STRIKE"
                                : "▲ RED COMMAND — LAUNCH STRIKE";
  if (game.phase == NC::GamePhase::ANIMATING)
    turnText = "⬡  MISSILE IN-FLIGHT...";
  drawGlowText(turnText, W / 2.f, H - 40.f, 18, turnCol, true);

  // ---- Controls hint bottom right ----
  drawGlowText("LMB: Strike   RMB+Drag: Rotate   Scroll: Zoom", W - 20.f,
               H - 40.f, 13, sf::Color(100, 130, 160, 180));
}

void UIRenderer::drawGameOver(const NC::Game &game) {
  float W = (float)window.getSize().x;
  float H = (float)window.getSize().y;

  // Dim overlay
  sf::RectangleShape overlay({W, H});
  overlay.setFillColor(sf::Color(0, 0, 0, 160));
  window.draw(overlay);

  bool blueWon = game.red.hp <= 0;
  sf::Color winCol = blueWon ? sf::Color(0, 210, 255) : sf::Color(255, 30, 60);

  drawGlowText(game.winnerText, W / 2.f, H / 2.f - 60.f, 48, winCol, true);
  drawGlowText("STRATEGIC ANNIHILATION COMPLETE", W / 2.f, H / 2.f + 10.f, 22,
               sf::Color(200, 210, 230, 220), true);
  drawGlowText("[ LEFT CLICK TO RESTART CONFLICT ]", W / 2.f, H / 2.f + 60.f,
               20, sf::Color(180, 200, 220, 180), true);
}
