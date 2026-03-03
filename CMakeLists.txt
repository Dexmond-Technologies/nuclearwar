cmake_minimum_required(VERSION 3.10)
project(NuclearConflict VERSION 2.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED True)
set(CMAKE_BUILD_TYPE Release)
set(CMAKE_CXX_FLAGS_RELEASE "-O2")

find_package(SFML 2.5 COMPONENTS graphics window system REQUIRED)
find_package(OpenGL REQUIRED)

add_executable(${PROJECT_NAME}
    src/main.cpp
    src/Game.cpp
    src/Renderer.cpp
    src/UIRenderer.cpp
    src/ParticleSystem.cpp
)

target_link_libraries(${PROJECT_NAME} PRIVATE
    sfml-graphics
    sfml-window
    sfml-system
    OpenGL::GL
    OpenGL::GLU
)
