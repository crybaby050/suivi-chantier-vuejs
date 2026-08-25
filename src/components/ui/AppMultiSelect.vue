<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // tableau d'ids sélectionnés
  options: { type: Array, default: () => [] }, // [{ value, label }]
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Rechercher...' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const recherche = ref('')
const ouvert = ref(false)

const optionsFiltrees = computed(() =>
  props.options.filter((o) => o.label.toLowerCase().includes(recherche.value.toLowerCase())),
)

function isSelected(value) {
  return props.modelValue.includes(value)
}

function toggle(value) {
  const current = [...props.modelValue]
  const idx = current.indexOf(value)
  if (idx !== -1) current.splice(idx, 1)
  else current.push(value)
  emit('update:modelValue', current)
}

function retirerSelection(value) {
  emit(
    'update:modelValue',
    props.modelValue.filter((v) => v !== value),
  )
}

function labelDe(value) {
  return props.options.find((o) => o.value === value)?.label ?? value
}

function fermer() {
  ouvert.value = false
  recherche.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <!-- Label -->
    <label v-if="label" class="text-xs font-bold text-texte">
      {{ label }}
      <span v-if="required" class="text-bloque ml-0.5">*</span>
    </label>

    <!-- Chips des sélectionnés -->
    <div v-if="modelValue.length" class="flex flex-wrap gap-1.5 mb-1">
      <span
        v-for="val in modelValue"
        :key="val"
        class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary"
      >
        {{ labelDe(val) }}
        <button
          type="button"
          class="flex items-center justify-center w-3.5 h-3.5 rounded-full hover:bg-primary/20 transition"
          @click="retirerSelection(val)"
        >
          <i class="fa-solid fa-xmark text-[9px]"></i>
        </button>
      </span>
    </div>

    <!-- Input recherche -->
    <div class="relative">
      <div
        class="flex items-center gap-2 w-full rounded-xl border px-3 py-2.5 cursor-text transition"
        :class="
          error
            ? 'border-bloque/50 bg-bloque/5'
            : ouvert
              ? 'border-primary/40 ring-2 ring-primary/10 bg-white'
              : 'border-bordure bg-fond'
        "
        @click="ouvert = true"
      >
        <i class="fa-solid fa-magnifying-glass text-xs text-muted flex-shrink-0"></i>
        <input
          v-model="recherche"
          type="text"
          :placeholder="modelValue.length ? `${modelValue.length} sélectionné(s)` : placeholder"
          class="flex-1 text-sm text-texte bg-transparent outline-none placeholder:text-muted/50 min-w-0"
          @focus="ouvert = true"
        />
        <button
          v-if="ouvert"
          type="button"
          class="text-muted hover:text-texte transition"
          @click.stop="fermer"
        >
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>

      <!-- Dropdown -->
      <div
        v-if="ouvert"
        class="absolute z-30 top-full mt-1 w-full rounded-xl border border-bordure bg-carte shadow-soft overflow-hidden"
      >
        <!-- Liste -->
        <div class="max-h-48 overflow-y-auto">
          <!-- Vide -->
          <div v-if="!optionsFiltrees.length" class="px-4 py-3 text-xs text-muted text-center">
            Aucun résultat pour "{{ recherche }}"
          </div>

          <!-- Options -->
          <button
            v-for="opt in optionsFiltrees"
            :key="opt.value"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition hover:bg-fond"
            :class="isSelected(opt.value) ? 'bg-primary/5' : ''"
            @click="toggle(opt.value)"
          >
            <!-- Checkbox visuelle -->
            <span
              class="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition"
              :class="
                isSelected(opt.value) ? 'bg-primary border-primary' : 'border-bordure bg-white'
              "
            >
              <i v-if="isSelected(opt.value)" class="fa-solid fa-check text-white text-[9px]"></i>
            </span>

            <!-- Initiale avatar -->
            <span
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary"
            >
              {{ opt.label.charAt(0).toUpperCase() }}
            </span>

            <span class="flex-1 font-medium text-texte truncate">{{ opt.label }}</span>

            <span
              v-if="isSelected(opt.value)"
              class="text-[10px] font-bold text-primary flex-shrink-0"
            >
              Sélectionné
            </span>
          </button>
        </div>

        <!-- Footer -->
        <div class="border-t border-bordure px-3 py-2 flex items-center justify-between">
          <span class="text-xs text-muted">
            {{ modelValue.length }} / {{ options.length }} sélectionné(s)
          </span>
          <button
            type="button"
            class="text-xs font-bold text-primary hover:underline"
            @click="fermer"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>

    <!-- Erreur -->
    <p v-if="error" class="text-xs text-bloque flex items-center gap-1">
      <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
      {{ error }}
    </p>
  </div>

  <!-- Overlay invisible pour fermer en cliquant dehors -->
  <Teleport to="body">
    <div v-if="ouvert" class="fixed inset-0 z-20" @click="fermer" />
  </Teleport>
</template>
