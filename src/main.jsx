import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './style.scss'
import { appTheme } from './appTheme.js'
import { ChakraProvider } from '@chakra-ui/react'


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={appTheme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
