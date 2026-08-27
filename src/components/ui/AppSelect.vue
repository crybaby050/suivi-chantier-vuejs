<script setup>
defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Sélectionner...' },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-xs font-bold text-texte">
      {{ label }}
      <span v-if="required" class="text-bloque ml-0.5">*</span>
    </label>
    <select
      :value="modelValue"
      class="w-full rounded-xl border px-4 py-2.5 text-sm text-texte outline-none transition appearance-none bg-fond"
      :class="
        error
          ? 'border-bloque/50 focus:ring-2 focus:ring-bloque/20'
          : 'border-bordure focus:border-primary/40 focus:ring-2 focus:ring-primary/10'
      "
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option value="" disabled>{{ placeholder }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <p v-if="error" class="text-xs text-bloque flex items-center gap-1">
      <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
      {{ error }}
    </p>
  </div>
</template>
