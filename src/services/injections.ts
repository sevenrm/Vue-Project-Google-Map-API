import { inject } from 'vue'

type ShowConfirm = (message: string, callback: () => void) => void
export const useShowConfirm = (): ShowConfirm => inject('showConfirm') as ShowConfirm
