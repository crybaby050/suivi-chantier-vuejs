<script setup>
defineProps({
  label: { type: String, default: '' },
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" class="text-xs font-bold text-texte">
      {{ label }}
      <span v-if="required" class="text-bloque ml-0.5">*</span>
    </label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full rounded-xl border px-4 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50"
      :class="
        error
          ? 'border-bloque/50 bg-bloque/5 focus:ring-2 focus:ring-bloque/20'
          : 'border-bordure bg-fond focus:border-primary/40 focus:ring-2 focus:ring-primary/10'
      "
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="text-xs text-bloque flex items-center gap-1">
      <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
      {{ error }}
    </p>
  </div>
</template>
