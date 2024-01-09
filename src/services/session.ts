export const JWT_KEY = 'jwt'
export const getJwt = (): string | null => sessionStorage.getItem(JWT_KEY)
export const setJwt = (token: string): void => sessionStorage.setItem(JWT_KEY, token)
export const deleteJwt = (): void => sessionStorage.removeItem(JWT_KEY)
