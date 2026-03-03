#pragma once
#include "Game.hpp"
#include <GL/glu.h>
#include <SFML/OpenGL.hpp>
#include <SFML/System/Vector2.hpp>
#include <cmath>
#include <vector>

static constexpr float PI_R = 3.14159265f;

struct Vec3 {
  float x, y, z;
};
struct Vec4 {
  float r, g, b, a;
};

inline Vec3 latLonToXYZ(float lat, float lon, float radius) {
  float la = lat * PI_R / 180.f;
  float lo = lon * PI_R / 180.f;
  return {radius * std::cos(la) * std::cos(lo), radius * std::sin(la),
          radius * std::cos(la) * std::sin(lo)};
}

inline Vec3 slerpLatLon(float la1, float lo1, float la2, float lo2, float t) {
  // Proper spherical linear interpolation
  float r = PI_R / 180.f;
  float lat1 = la1 * r, lon1 = lo1 * r, lat2 = la2 * r, lon2 = lo2 * r;
  float x1 = std::cos(lat1) * std::cos(lon1), y1 = std::sin(lat1),
        z1 = std::cos(lat1) * std::sin(lon1);
  float x2 = std::cos(lat2) * std::cos(lon2), y2 = std::sin(lat2),
        z2 = std::cos(lat2) * std::sin(lon2);
  float dot = x1 * x2 + y1 * y2 + z1 * z2;
  dot = std::max(-1.f, std::min(1.f, dot));
  float omega = std::acos(dot);
  if (omega < 0.0001f)
    return {x1, y1, z1};
  float s = std::sin(omega);
  float sa = std::sin((1 - t) * omega) / s;
  float sb = std::sin(t * omega) / s;
  return {sa * x1 + sb * x2, sa * y1 + sb * y2, sa * z1 + sb * z2};
}

class Renderer {
public:
  Renderer(int w, int h);

  void beginFrame(float rotX, float rotY, float zoom);
  void drawEarth();
  void drawAtmosphere();
  void drawBase(float lat, float lon, NC::Faction f, float pulse);
  void drawMissile(const NC::Missile &m, float time);
  void drawExplosion(const NC::Explosion &e);
  void drawGrid();

  void setViewport(int w, int h);

private:
  void setCol(float r, float g, float b, float a);
  void spherePoint(float lat, float lon, float r);
  void glowLine(Vec3 a, Vec3 b, Vec4 col, float layers = 3.f);
  void drawRing(float lat, float lon, float radius, Vec4 col, int segs = 64);
  void drawOctahedron(float lat, float lon, float r, float scale, Vec4 col);

  int W, H;
};
