#pragma once
#include "Game.hpp"
#include <SFML/Graphics.hpp>
#include <string>

class UIRenderer {
public:
  UIRenderer(sf::RenderWindow &win);

  void drawHUD(const NC::Game &game, float time);
  void drawGameOver(const NC::Game &game);
  void drawInstructions(NC::Faction turn);

private:
  void drawHPBar(float x, float y, float w, float h, float pct, sf::Color fgCol,
                 sf::Color bgCol, const std::string &label, int hp, int maxHp);
  void drawGlowText(const std::string &text, float x, float y,
                    unsigned int size, sf::Color col, bool centered = false);

  sf::RenderWindow &window;
  sf::Font font;
  bool fontLoaded = false;
};
