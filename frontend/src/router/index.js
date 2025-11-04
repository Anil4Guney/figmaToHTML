import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import AIChatView from "../views/AIChatView.vue";
const FigmaToPrimeVueView = () => import("../views/FigmaToPrimeVueView.vue");

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/ai", name: "ai", component: AIChatView },
    { path: "/figma", name: "figma", component: FigmaToPrimeVueView },
  ],
});

export default router;
