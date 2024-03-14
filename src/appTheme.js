import { extendTheme } from "@chakra-ui/react"
import { ButtonStyles as Button } from "./ButtonStyles";

export const appTheme = extendTheme({ 
  colors: {
      transparent: 'transparent',
      black: '#000',
      white: '#fff',
      brand: {
        300: '#6b46c1', // Light Purple
        200: '#663399', // Deep Purple
        100: '#0292f3', // Brand Blue
    },
  },  
  components: {
    Button
  }
});





  