#include "Renderer.hpp"
#include <GL/glu.h>
#include <cmath>
#include <vector>

Renderer::Renderer(int w, int h) : W(w), H(h) {
  glEnable(GL_DEPTH_TEST);
  glDepthMask(GL_TRUE);
  glClearDepth(1.0);

  // KEY: Additive blending for neon glow!
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE);

  // Smooth lines
  glEnable(GL_LINE_SMOOTH);
  glHint(GL_LINE_SMOOTH_HINT, GL_NICEST);

  glEnable(GL_POINT_SMOOTH);
  glHint(GL_POINT_SMOOTH_HINT, GL_NICEST);

  setViewport(w, h);
}

void Renderer::setViewport(int w, int h) {
  W = w;
  H = h;
  glViewport(0, 0, w, h);
  glMatrixMode(GL_PROJECTION);
  glLoadIdentity();
  gluPerspective(50.0, (double)w / h, 0.5, 500.0);
  glMatrixMode(GL_MODELVIEW);
}

void Renderer::setCol(float r, float g, float b, float a) {
  glColor4f(r, g, b, a);
}

void Renderer::spherePoint(float lat, float lon, float r) {
  Vec3 p = latLonToXYZ(lat, lon, r);
  glVertex3f(p.x, p.y, p.z);
}

void Renderer::beginFrame(float rotX, float rotY, float zoom) {
  glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
  glClearColor(0.005f, 0.008f, 0.018f, 1.f);

  glLoadIdentity();
  glTranslatef(0.f, 0.f, zoom);
  glRotatef(rotX, 1.f, 0.f, 0.f);
  glRotatef(rotY, 0.f, 1.f, 0.f);
}

// Draw the Earth — dense grid with subtle lat/lon halo shading
void Renderer::drawEarth() {
  const float R = 20.f;
  const int LATS = 36, LONS = 72;

  // === Pass 1: Deep dark base grid ===
  glLineWidth(1.0f);
  setCol(0.01f, 0.09f, 0.22f, 0.7f);

  for (int i = 0; i <= LATS; i++) {
    float lat = -90.f + i * 180.f / LATS;
    glBegin(GL_LINE_STRIP);
    for (int j = 0; j <= LONS; j++) {
      float lon = -180.f + j * 360.f / LONS;
      spherePoint(lat, lon, R);
    }
    glEnd();
  }
  for (int j = 0; j <= LONS; j++) {
    float lon = -180.f + j * 360.f / LONS;
    glBegin(GL_LINE_STRIP);
    for (int i = 0; i <= LATS; i++) {
      float lat = -90.f + i * 180.f / LATS;
      spherePoint(lat, lon, R);
    }
    glEnd();
  }

  // === Pass 2: Equator and Prime Meridian brighter highlight ===
  glLineWidth(1.5f);
  setCol(0.03f, 0.30f, 0.55f, 0.9f);

  // Equator
  glBegin(GL_LINE_LOOP);
  for (int j = 0; j <= 180; j++) {
    float lon = -180.f + j * 2.f;
    spherePoint(0.f, lon, R + 0.02f);
  }
  glEnd();

  // Tropics
  for (float tLat : {23.5f, -23.5f, 66.5f, -66.5f}) {
    setCol(0.02f, 0.18f, 0.38f, 0.6f);
    glBegin(GL_LINE_LOOP);
    for (int j = 0; j <= 180; j++) {
      float lon = -180.f + j * 2.f;
      spherePoint(tLat, lon, R + 0.01f);
    }
    glEnd();
  }

  // === Pass 3: Atmospheric glow rim (outer halo) ===
  // We simulate atmosphere by drawing a slightly larger transparent sphere
  glLineWidth(1.f);
  const float RA = R + 0.6f;
  const int AL = 18, ALON = 36;
  glColor4f(0.15f, 0.50f, 1.0f, 0.04f);
  for (int i = 0; i <= AL; i++) {
    float lat = -90.f + i * 180.f / AL;
    glBegin(GL_LINE_STRIP);
    for (int j = 0; j <= ALON; j++) {
      float lon = -180.f + j * 360.f / ALON;
      spherePoint(lat, lon, RA);
    }
    glEnd();
  }
}

// Draw a glowing octahedron base at Lat/Lon
void Renderer::drawOctahedron(float lat, float lon, float sphereR, float scale,
                              Vec4 col) {
  Vec3 center = latLonToXYZ(lat, lon, sphereR);

  // Compute local "up" direction (surface normal)
  Vec3 up = {center.x / sphereR, center.y / sphereR, center.z / sphereR};

  // Pick an arbitrary tangent
  Vec3 t1 = {-up.z, 0, up.x};
  float tLen = std::sqrt(t1.x * t1.x + t1.z * t1.z);
  if (tLen < 0.001f) {
    t1 = {0, up.z, -up.y};
    tLen = std::sqrt(t1.y * t1.y + t1.z * t1.z);
  }
  t1.x /= tLen;
  t1.y /= tLen;
  t1.z /= tLen;

  // Cross product for second tangent
  Vec3 t2 = {up.y * t1.z - up.z * t1.y, up.z * t1.x - up.x * t1.z,
             up.x * t1.y - up.y * t1.x};

  // 6 vertices of an octahedron oriented to surface
  auto addOff = [&](float u, float v, float n) -> Vec3 {
    return {center.x + u * t1.x * scale + v * t2.x * scale + n * up.x * scale,
            center.y + u * t1.y * scale + v * t2.y * scale + n * up.y * scale,
            center.z + u * t1.z * scale + v * t2.z * scale + n * up.z * scale};
  };

  Vec3 top = addOff(0, 0, 2);
  Vec3 bot = addOff(0, 0, -1);
  Vec3 rf = addOff(1, 0, 0.5f);
  Vec3 lf = addOff(-1, 0, 0.5f);
  Vec3 bk = addOff(0, 1, 0.5f);
  Vec3 fr = addOff(0, -1, 0.5f);

  auto tri = [&](Vec3 a, Vec3 b, Vec3 c, float alpha) {
    glColor4f(col.r, col.g, col.b, alpha);
    glBegin(GL_LINE_LOOP);
    glVertex3f(a.x, a.y, a.z);
    glVertex3f(b.x, b.y, b.z);
    glVertex3f(c.x, c.y, c.z);
    glEnd();
  };

  // Multi-pass glow: draw 3 times with decreasing opacity and growing scale —
  // cheap but effective
  for (int pass = 0; pass < 3; pass++) {
    float s = 1.0f + pass * 0.3f;
    float a = (pass == 0) ? 0.9f : (pass == 1) ? 0.4f : 0.15f;
    Vec3 TOP = addOff(0, 0, 2 * s);
    Vec3 BOT = addOff(0, 0, -1 * s);
    Vec3 RF = addOff(1 * s, 0, 0.5f);
    Vec3 LF = addOff(-1 * s, 0, 0.5f);
    Vec3 BK = addOff(0, 1 * s, 0.5f);
    Vec3 FR = addOff(0, -1 * s, 0.5f);
    tri(TOP, RF, BK, a);
    tri(TOP, BK, LF, a);
    tri(TOP, LF, FR, a);
    tri(TOP, FR, RF, a);
    tri(BOT, RF, BK, a);
    tri(BOT, BK, LF, a);
    tri(BOT, LF, FR, a);
    tri(BOT, FR, RF, a);
  }

  // Central point/dot on tip
  glPointSize(6.f);
  glColor4f(col.r, col.g, col.b, 1.f);
  glBegin(GL_POINTS);
  glVertex3f(top.x, top.y, top.z);
  glEnd();
}

void Renderer::drawBase(float lat, float lon, NC::Faction f, float pulse) {
  Vec4 col;
  Vec4 ringCol;
  if (f == NC::Faction::BLUE) {
    col = {0.0f, 0.85f, 1.0f, 1.f};
    ringCol = {0.0f, 0.50f, 1.0f, 1.f};
  } else {
    col = {1.0f, 0.05f, 0.20f, 1.f};
    ringCol = {1.0f, 0.20f, 0.10f, 1.f};
  }

  // Base structure
  drawOctahedron(lat, lon, 20.f, 1.5f + pulse * 0.2f, col);

  // Ground ring — multiple pass glow
  for (int pass = 0; pass < 3; pass++) {
    float ringR = (3.5f + pass * 1.2f) * (1.f + pulse * 0.1f);
    float alpha = (pass == 0) ? 0.8f : (pass == 1) ? 0.3f : 0.1f;
    glColor4f(ringCol.r, ringCol.g, ringCol.b, alpha);
    glLineWidth(pass == 0 ? 2.f : 1.f);
    drawRing(lat, lon, ringR, {ringCol.r, ringCol.g, ringCol.b, alpha});
  }

  // Pulsing outer ring
  float pr = 5.f + pulse * 4.f;
  float pa = (1.f - pulse) * 0.5f;
  glLineWidth(1.5f);
  drawRing(lat, lon, pr, {col.r, col.g, col.b, pa});
}

void Renderer::drawRing(float lat, float lon, float ringRadius, Vec4 col,
                        int segs) {
  Vec3 center = latLonToXYZ(lat, lon, 20.f);
  Vec3 up = {center.x / 20.f, center.y / 20.f, center.z / 20.f};

  Vec3 t1 = {-up.z, 0, up.x};
  float tLen = std::sqrt(t1.x * t1.x + t1.z * t1.z);
  if (tLen < 0.001f)
    tLen = 0.001f;
  t1.x /= tLen;
  t1.z /= tLen;
  Vec3 t2 = {up.y * t1.z - up.z * t1.y, up.z * t1.x - up.x * t1.z,
             up.x * t1.y - up.y * t1.x};

  glColor4f(col.r, col.g, col.b, col.a);
  glBegin(GL_LINE_LOOP);
  for (int i = 0; i < segs; i++) {
    float theta = 2.f * PI_R * i / segs;
    float cx = std::cos(theta) * ringRadius;
    float cz = std::sin(theta) * ringRadius;
    glVertex3f(center.x + cx * t1.x + cz * t2.x,
               center.y + cx * t1.y + cz * t2.y,
               center.z + cx * t1.z + cz * t2.z);
  }
  glEnd();
}

void Renderer::drawMissile(const NC::Missile &m, float time) {
  Vec4 col = (m.owner == NC::Faction::BLUE) ? Vec4{0.0f, 0.9f, 1.0f, 1.f}
                                            : Vec4{1.0f, 0.1f, 0.2f, 1.f};

  const int STEPS = 64;
  const float R = 20.f;

  // Draw trail — multi-pass glow
  for (int pass = 0; pass < 4; pass++) {
    float lw = (pass == 0) ? 3.f : (pass == 1) ? 5.f : (pass == 2) ? 8.f : 12.f;
    float ba = (pass == 0)   ? 1.0f
               : (pass == 1) ? 0.4f
               : (pass == 2) ? 0.15f
                             : 0.05f;
    glLineWidth(lw);

    glBegin(GL_LINE_STRIP);
    for (int i = 0; i <= STEPS; i++) {
      float t = (float)i / STEPS;
      if (t > m.progress)
        break;

      // Trail fade: older segments more transparent
      float trailFade = t / m.progress;
      float alpha = ba * trailFade;
      glColor4f(col.r, col.g, col.b, alpha);

      Vec3 p = slerpLatLon(m.startLat, m.startLon, m.endLat, m.endLon, t);
      // Arc height: sin curve peaks at mid-flight
      float arcH = std::sin(t * PI_R) * 10.f;
      float pr = std::sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      if (pr > 0.001f) {
        float boost = (R + arcH) / pr;
        glVertex3f(p.x * boost, p.y * boost, p.z * boost);
      }
    }
    glEnd();
  }
  glLineWidth(1.f);

  // Missile head — bright glowing dot
  {
    float t = m.progress;
    Vec3 p = slerpLatLon(m.startLat, m.startLon, m.endLat, m.endLon, t);
    float arcH = std::sin(t * PI_R) * 10.f;
    float pr = std::sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
    float boost = (pr > 0.001f) ? (R + arcH) / pr : 1.f;
    float hx = p.x * boost, hy = p.y * boost, hz = p.z * boost;

    // head: white core + faction color halo
    for (int pass = 0; pass < 3; pass++) {
      float pt = pass == 0 ? 8.f : pass == 1 ? 14.f : 20.f;
      float pa = pass == 0 ? 1.0f : pass == 1 ? 0.5f : 0.2f;
      if (pass == 0)
        glColor4f(1.f, 1.f, 1.f, pa);
      else
        glColor4f(col.r, col.g, col.b, pa);
      glPointSize(pt);
      glBegin(GL_POINTS);
      glVertex3f(hx, hy, hz);
      glEnd();
    }
  }
}

void Renderer::drawExplosion(const NC::Explosion &e) {
  Vec4 col = (e.owner == NC::Faction::BLUE) ? Vec4{0.f, 0.9f, 1.f, 1.f}
                                            : Vec4{1.f, 0.1f, 0.2f, 1.f};

  float t = 1.f - e.life; // 0=just hit, 1=fading
  float outerR = e.maxRadius * t;
  float alpha = e.life;

  // Multiple expanding rings
  for (int ring = 0; ring < 3; ring++) {
    float rr = outerR * (1.f - ring * 0.25f);
    float ra = alpha * (1.f - ring * 0.3f);
    if (rr <= 0.f || ra <= 0.f)
      continue;

    // 3 glow passes per ring
    for (int pass = 0; pass < 3; pass++) {
      float lw = (pass == 0) ? 2.f : (pass == 1) ? 4.f : 7.f;
      float ba = (pass == 0) ? ra : (pass == 1) ? ra * 0.4f : ra * 0.15f;
      glLineWidth(lw);
      drawRing(e.lat, e.lon, rr, {col.r, col.g, col.b, ba});
    }
  }

  // Central flash: white dot at start
  if (t < 0.3f) {
    Vec3 center = latLonToXYZ(e.lat, e.lon, 20.1f);
    float fa = (0.3f - t) / 0.3f;
    glPointSize(30.f * fa + 5.f);
    glColor4f(1.f, 1.f, 1.f, fa);
    glBegin(GL_POINTS);
    glVertex3f(center.x, center.y, center.z);
    glEnd();
    glPointSize(60.f * fa);
    glColor4f(col.r, col.g, col.b, fa * 0.5f);
    glBegin(GL_POINTS);
    glVertex3f(center.x, center.y, center.z);
    glEnd();
  }
  glLineWidth(1.f);
}
