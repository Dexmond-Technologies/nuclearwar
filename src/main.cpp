#include "Game.hpp"
#include "Renderer.hpp"
#include "UIRenderer.hpp"
#include <GL/glu.h>
#include <SFML/Graphics.hpp>
#include <SFML/OpenGL.hpp>
#include <SFML/Window.hpp>
#include <cmath>
#include <ctime>
#include <iostream>

static constexpr float PI = 3.14159265f;

// Unproject a screen click onto the sphere surface, returning lat/lon if hit.
// Returns true if the ray hit the sphere.
bool pickSphere(int mx, int my, int W, int H, float rotX, float rotY,
                float zoom, float &outLat, float &outLon) {
  // Get GL matrices
  GLdouble modelM[16], projM[16];
  GLint vp[4];
  glGetDoublev(GL_MODELVIEW_MATRIX, modelM);
  glGetDoublev(GL_PROJECTION_MATRIX, projM);
  glGetIntegerv(GL_VIEWPORT, vp);

  // Unproject two depths to get a ray
  GLdouble nx0, ny0, nz0, nx1, ny1, nz1;
  gluUnProject(mx, H - my, 0.0, modelM, projM, vp, &nx0, &ny0, &nz0);
  gluUnProject(mx, H - my, 1.0, modelM, projM, vp, &nx1, &ny1, &nz1);

  // Camera origin in world space
  float cx = 0, cy = 0, cz = -zoom; // approximate
  float dx = (float)(nx1 - nx0);
  float dy = (float)(ny1 - ny0);
  float dz = (float)(nz1 - nz0);

  // Ray-sphere intersection: |ray(t)|^2 = R^2
  // ray = origin + t * dir
  float ox = (float)nx0, oy = (float)ny0, oz = (float)nz0;
  float R = 20.f;
  float a = dx * dx + dy * dy + dz * dz;
  float b = 2.f * (ox * dx + oy * dy + oz * dz);
  float c = ox * ox + oy * oy + oz * oz - R * R;
  float disc = b * b - 4 * a * c;
  if (disc < 0 || a < 0.0001f)
    return false;

  float t = (-b - std::sqrt(disc)) / (2.f * a);
  if (t < 0)
    t = (-b + std::sqrt(disc)) / (2.f * a);
  if (t < 0)
    return false;

  float hx = ox + t * dx;
  float hy = oy + t * dy;
  float hz = oz + t * dz;

  outLat = std::asin(hy / R) * 180.f / PI;
  outLon = std::atan2(hz, hx) * 180.f / PI;
  return true;
}

int main() {
  std::srand((unsigned)std::time(nullptr));

  const int W = 1400, H = 800;
  sf::ContextSettings ctx;
  ctx.depthBits = 24;
  ctx.stencilBits = 8;
  ctx.antialiasingLevel = 8; // max AA for smooth lines
  ctx.majorVersion = 2;
  ctx.minorVersion = 1;

  sf::RenderWindow window(sf::VideoMode(W, H),
                          "NUCLEAR CONFLICT — DEXMOND TECHNOLOGIES",
                          sf::Style::Default, ctx);
  window.setVerticalSyncEnabled(true);
  window.setFramerateLimit(60);

  // Init GL
  glClearColor(0.005f, 0.008f, 0.018f, 1.f);
  glEnable(GL_DEPTH_TEST);
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE);
  glEnable(GL_LINE_SMOOTH);
  glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);
  glEnable(GL_POINT_SMOOTH);
  glHint(GL_POINT_SMOOTH_HINT, GL_NICEST);

  glMatrixMode(GL_PROJECTION);
  glLoadIdentity();
  gluPerspective(50.0, (double)W / H, 0.5, 500.0);
  glMatrixMode(GL_MODELVIEW);

  Renderer renderer(W, H);
  UIRenderer ui(window);
  NC::Game game;

  float rotX = 15.f;
  float rotY = -30.f;
  float zoom = -60.f;
  float autoRot = 8.f; // degrees per second
  float time = 0.f;
  float pulse = 0.f;

  bool dragging = false;
  sf::Vector2i lastMouse;

  sf::Clock clock;

  while (window.isOpen()) {
    float dt = clock.restart().asSeconds();
    time += dt;
    pulse = 0.5f + 0.5f * std::sin(time * 3.f);

    // ---- Events ----
    sf::Event ev;
    while (window.pollEvent(ev)) {
      if (ev.type == sf::Event::Closed)
        window.close();

      if (ev.type == sf::Event::Resized) {
        glViewport(0, 0, ev.size.width, ev.size.height);
        glMatrixMode(GL_PROJECTION);
        glLoadIdentity();
        gluPerspective(50.0, (double)ev.size.width / ev.size.height, 0.5,
                       500.0);
        glMatrixMode(GL_MODELVIEW);
      }

      if (ev.type == sf::Event::MouseButtonPressed) {
        if (ev.mouseButton.button == sf::Mouse::Right) {
          dragging = true;
          lastMouse = {ev.mouseButton.x, ev.mouseButton.y};
        }
        if (ev.mouseButton.button == sf::Mouse::Left) {
          if (game.phase == NC::GamePhase::GAME_OVER) {
            game.reset();
          } else if (game.phase == NC::GamePhase::PLAYING) {
            // Build matrices for picking
            glLoadIdentity();
            glTranslatef(0.f, 0.f, zoom);
            glRotatef(rotX, 1.f, 0.f, 0.f);
            glRotatef(rotY, 0.f, 1.f, 0.f);

            float hitLat, hitLon;
            if (pickSphere(ev.mouseButton.x, ev.mouseButton.y,
                           window.getSize().x, window.getSize().y, rotX, rotY,
                           zoom, hitLat, hitLon)) {
              game.fireMissile(hitLat, hitLon);
            }
          }
        }
      }
      if (ev.type == sf::Event::MouseButtonReleased)
        if (ev.mouseButton.button == sf::Mouse::Right)
          dragging = false;

      if (ev.type == sf::Event::MouseMoved && dragging) {
        sf::Vector2i cur = {ev.mouseMove.x, ev.mouseMove.y};
        rotY -= (lastMouse.x - cur.x) * 0.4f;
        rotX -= (lastMouse.y - cur.y) * 0.4f;
        if (rotX > 85.f)
          rotX = 85.f;
        if (rotX < -85.f)
          rotX = -85.f;
        lastMouse = cur;
      }

      if (ev.type == sf::Event::MouseWheelScrolled) {
        zoom += ev.mouseWheelScroll.delta * 3.f;
        if (zoom > -20.f)
          zoom = -20.f;
        if (zoom < -150.f)
          zoom = -150.f;
      }

      if (ev.type == sf::Event::KeyPressed &&
          ev.key.code == sf::Keyboard::Escape)
        window.close();
    }

    // ---- Update ----
    game.update(dt);

    // Auto-rotate when idle
    if (!dragging && game.missiles.empty())
      rotY += autoRot * dt;

    // ---- Render 3D ----
    window.setActive(true);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

    glLoadIdentity();
    glTranslatef(0.f, 0.f, zoom);
    glRotatef(rotX, 1.f, 0.f, 0.f);
    glRotatef(rotY, 0.f, 1.f, 0.f);

    renderer.drawEarth();

    // Draw bases
    renderer.drawBase(game.blue.lat, game.blue.lon, NC::Faction::BLUE, pulse);
    renderer.drawBase(game.red.lat, game.red.lon, NC::Faction::RED, pulse);

    // Missiles
    for (auto &m : game.missiles)
      renderer.drawMissile(m, time);

    // Explosions
    for (auto &e : game.explosions)
      renderer.drawExplosion(e);

    // ---- Render 2D SFML HUD ----
    window.pushGLStates();
    window.resetGLStates();

    if (game.phase != NC::GamePhase::GAME_OVER)
      ui.drawHUD(game, time);
    else
      ui.drawGameOver(game);

    window.popGLStates();

    window.display();
  }

  return 0;
}
