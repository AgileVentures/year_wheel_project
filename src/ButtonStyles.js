  export const ButtonStyles = {
    // For base or default style
    baseStyle: {
      fontWeight: 'bold',
      _hover: {
        _disabled: {
          bg: 'brand.300',
        },
      },
    },
    // Styles for different visual variants ("outline", "solid")
    variants: {
      primary: {
        bg: 'brand.200',
        color: 'white',
        _hover: { 
          bg: 'brand.300',
          boxShadow: 'md',
          transform: 'scale(1.10)',
          borderColor: '#2477b3',
        }
      },
      primaryOutline: {
        bg: 'brand.200',
        color: 'white',
        _hover: { 
          bg: 'brand.300',
          boxShadow: 'md',
          transform: 'scale(1.05)',
          border: '1.5px solid',
          borderColor: 'white',
        }
      },
    },
    //For different sizes ("sm", "md", "lg")
    sizes: {},
    //Default values for 'size and 'variant' 
    defaultProps: {
      // Then here we set the base variant as the default
      variant: 'base'
    }
  }