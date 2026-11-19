<script setup>
import { computed } from 'vue';
import Icon from './Icon.vue';
import AppButton from './AppButton.vue';
import WordHeading from './WordHeading.vue';
import WordExample from './WordExample.vue';
import { checkAnswer } from '../scheduler.js';
import { useStudyActions } from '../composables/study-context.js';
const props = defineProps({ word: Object, progress: Object, ui: Object });
const actions = useStudyActions();
const isNew = computed(() => props.progress.status === 'new');
const result = computed(() => props.ui.quiz?.result ?? null);
const canFlip = computed(() => isNew.value || result.value !== null);
const showingQuiz = computed(() => !isNew.value && !props.ui.flipped);
const englishVisible = computed(() => (isNew.value ? !props.ui.flipped : props.ui.flipped));
const statusLabel = computed(() =>
  isNew.value ? 'Нове слово' : props.progress.status === 'learning' ? 'У навчанні' : 'Повторення',
);
const correct = (option) => checkAnswer(option, props.word.word);
</script>

<template>
  <div class="study-stack">
    <article class="study-card" :data-status="progress.status" :data-quiz="showingQuiz">
      <p
        v-if="result !== null"
        class="answer-feedback"
        :class="result ? 'correct' : 'incorrect'"
        role="status"
      >
        {{ result ? 'Правильно!' : 'Не зовсім. Запам’ятай відповідь — слово повернеться ще раз.' }}
      </p>
      <div class="card-top">
        <span>
          <i></i>
          {{ statusLabel }}
        </span>
        <span>{{ word.level.toUpperCase() }}</span>
      </div>
      <div class="card-content">
        <div
          class="card-face"
          :tabindex="canFlip ? 0 : null"
          :role="canFlip ? 'button' : null"
          :aria-label="canFlip ? 'Перевернути картку' : null"
          :data-action="canFlip ? 'flip' : null"
          @click="canFlip && actions.act('flip')"
          @keydown.enter.prevent="canFlip && actions.act('flip')"
          @keydown.space.prevent="canFlip && actions.act('flip')"
        >
          <template v-if="isNew && !ui.flipped">
            <span class="card-label card-label-spacer" aria-hidden="true">Переклад</span>
            <WordHeading :word="word" />
            <WordExample v-if="word.example" :text="word.example" />
          </template>
          <template v-else-if="isNew">
            <span class="card-label">Переклад</span>
            <h2 class="study-word">{{ word.translation }}</h2>
            <div v-if="word.definition" class="card-detail">
              <h3>Визначення</h3>
              <p lang="en">{{ word.definition }}</p>
            </div>
          </template>
          <template v-else-if="!ui.flipped">
            <span class="card-label">Обери правильний переклад</span>
            <h2 class="study-word">{{ word.translation }}</h2>
          </template>
          <template v-else>
            <WordHeading :word="word" />
            <div v-if="word.definition" class="card-detail">
              <h3>Визначення</h3>
              <p lang="en">{{ word.definition }}</p>
            </div>
            <WordExample v-if="word.example" :text="word.example" />
          </template>
        </div>
        <div v-if="showingQuiz" class="quiz-options" role="group" aria-label="Варіанти відповіді">
          <button
            v-for="(option, index) in ui.quiz.options"
            :key="index"
            type="button"
            class="app-button secondary quiz-option"
            data-action="choose-option"
            @click="actions.act('choose-option', index)"
            :data-option="index"
            lang="en"
            :disabled="result !== null"
          >
            {{ option }}
            <span v-if="result !== null && correct(option)" class="correct">
              <Icon name="check" />
            </span>
            <span v-else-if="result === false && ui.quiz.selected === index" class="incorrect">
              <Icon name="close" />
            </span>
          </button>
        </div>
      </div>
      <div v-if="canFlip" class="card-bottom">
        <AppButton v-if="englishVisible" action="speak" icon="sound" class="card-audio">
          Прослухати
        </AppButton>
        <AppButton action="flip" icon="flip" class="flip-button">Перевернути картку</AppButton>
      </div>
    </article>
  </div>
  <div class="study-actions">
    <AppButton action="left" :icon="isNew ? 'close' : 'flip'" class="secondary">
      {{ isNew ? 'Пропустити' : 'Не знаю' }}
    </AppButton>
    <AppButton action="right" icon="check" class="primary" :disabled="!isNew && result === null">
      {{ isNew ? 'Вчити' : result === false ? 'Повторити' : 'Далі' }}
    </AppButton>
  </div>
  <p class="study-hint visually-hidden">
    {{
      isNew
        ? 'Переглянь слово й додай його до навчання.'
        : 'Обери правильний переклад із чотирьох варіантів.'
    }}
  </p>
</template>
