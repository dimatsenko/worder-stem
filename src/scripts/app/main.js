import { createApp } from 'vue';
import { initNavigation } from '../navigation.js';
import App from './App.vue';

initNavigation();
const root = document.getElementById('web-app');
createApp(App, { root }).mount(root);
