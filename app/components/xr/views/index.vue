<template>
  <xr-3d-holographic-slate
    :position="[0, 1.5, 2]"
    :dimensions="[1.2, 0.8]"
    :min-dimensions="[0.5, 0.5]"
    :title-bar-height="0.08"
    :content-resolution="2048"
    :billboard="true"
    title="Main Menu"
  >
    <!-- Контейнер для всего окна -->
    <xr-2d-rectangle
      width="100%"
      height="100%"
      :thickness="0"
    >
      <!-- Левое меню (Left Sidebar) -->
      <xr-2d-rectangle
        width="30%"
        height="100%"
        :horizontal-alignment="0"
        background="#1e1e1e"
        :thickness="0"
      >
        <xr-2d-stack-panel
          width="100%"
          height="100%"
          :is-vertical="true"
          padding-top="40px"
          padding-left="20px"
          padding-right="20px"
        >
          <xr-2d-text-block
            text="Navigation"
            color="white"
            font-size="60px"
            height="80px"
          />

          <xr-2d-button
            text="Home"
            height="100px"
            color="white"
            font-size="40px"
            background="#333"
            corner-radius="10"
            padding-bottom="20px"
          />
          <xr-2d-button
            text="Settings"
            height="100px"
            color="white"
            font-size="40px"
            background="#222"
            corner-radius="10"
            padding-bottom="20px"
            @click="goToSettings"
          />
          <xr-2d-button
            text="Profile"
            height="100px"
            color="white"
            font-size="40px"
            background="#222"
            corner-radius="10"
            padding-bottom="20px"
          />
        </xr-2d-stack-panel>
      </xr-2d-rectangle>

      <!-- Основной контент (Main Screen) -->
      <xr-2d-rectangle
        width="70%"
        height="100%"
        :horizontal-alignment="1"
        background="#2a2a2a"
        :thickness="0"
      >
        <xr-2d-scroll-viewer
          width="100%"
          height="100%"
          :thickness="0"
          color="#888"
        >
          <xr-2d-stack-panel
            width="100%"
            :is-vertical="true"
            padding-top="40px"
            padding-left="40px"
            padding-right="40px"
          >
            <xr-2d-text-block
              text="Welcome to WebXR"
              color="white"
              font-size="80px"
              height="120px"
            />

            <xr-2d-text-block
              text="This is a scrollable area. You can put a lot of content here to test the scrolling functionality of the Holographic Slate."
              color="#cccccc"
              font-size="40px"
              text-wrapping="true"
              height="200px"
            />

            <!-- Генерируем много блоков для проверки скролла -->
            <xr-2d-rectangle
              v-for="i in 10"
              :key="i"
              width="100%"
              height="150px"
              background="#333333"
              corner-radius="15"
              padding-bottom="20px"
              :thickness="0"
            >
              <xr-2d-text-block
                :text="`Content Card ${i}`"
                color="white"
                font-size="50px"
              />
            </xr-2d-rectangle>
          </xr-2d-stack-panel>
        </xr-2d-scroll-viewer>
      </xr-2d-rectangle>
    </xr-2d-rectangle>
  </xr-3d-holographic-slate>
</template>

<script setup lang="ts">
import { useXRRouter } from '../app/route'

const router = useXRRouter()

const goToSettings = () => {
  router.push('/settings')
}
</script>
