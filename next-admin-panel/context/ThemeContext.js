'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(undefined)

export function ThemeProvider({ children }) {
    const [darkMode, setDarkMode] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('darkMode')

        if (saved !== null) {
            const parsed = JSON.parse(saved)
            setDarkMode(parsed)
            document.documentElement.classList.toggle('dark', parsed)
        } else {
            // Optional: use system preference
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
            setDarkMode(systemDark)
            document.documentElement.classList.toggle('dark', systemDark)
        }

        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        localStorage.setItem('darkMode', JSON.stringify(darkMode))
        document.documentElement.classList.toggle('dark', darkMode)
    }, [darkMode, mounted])

    const toggleDarkMode = () => setDarkMode(prev => !prev)

    return (
        <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}