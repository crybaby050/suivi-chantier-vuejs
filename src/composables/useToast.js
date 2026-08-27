import { ref } from 'vue'

const message = ref('')
const type    = ref('success')
const visible = ref(false)
let timer = null

export function useToast() {
  function showToast(msg, t = 'success') {
    message.value = msg
    type.value    = t
    visible.value = true
    clearTimeout(timer)
    timer = setTimeout(() => { visible.value = false }, 2800)
  }
  return { message, type, visible, showToast }
}