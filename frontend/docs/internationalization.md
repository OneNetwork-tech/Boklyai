# Internationalization (i18n) Implementation

## Overview

The BoklyAI frontend application has been configured with internationalization support using `i18next` and `react-i18next`. The application defaults to Swedish (sv) with English (en) as a secondary language.

## Language Configuration

The default language is set to Swedish in the i18n configuration file. Users can switch between Swedish and English using the language switcher component in the header.

### Default Language Priority
1. **Swedish (sv)** - Primary language
2. **English (en)** - Secondary language

## File Structure

```
src/
├── i18n.ts                 # i18n configuration
├── components/
│   └── LanguageSwitcher.tsx # Language switcher component
└── ...
```

## Adding New Translations

To add new translations:

1. Add new key-value pairs to the translation objects in `src/i18n.ts`
2. Use the translation keys in your components with the `t()` function

Example:
```typescript
// In src/i18n.ts
const resources = {
  sv: {
    translation: {
      "new_key": "Svensk översättning"
    }
  },
  en: {
    translation: {
      "new_key": "English translation"
    }
  }
};

// In your component
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return <h1>{t('new_key')}</h1>;
}
```

## Using Translations in Components

To use translations in any component:

1. Import the `useTranslation` hook:
```typescript
import { useTranslation } from 'react-i18next';
```

2. Use the hook in your component:
```typescript
const { t } = useTranslation();
```

3. Use the `t()` function to get translated strings:
```typescript
<h1>{t('welcome')}</h1>
```

## Language Switching

The language switcher component is located in the header and allows users to toggle between Swedish and English. The active language is highlighted.

To change the language programmatically:
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { i18n } = useTranslation();
  
  const changeToSwedish = () => {
    i18n.changeLanguage('sv');
  };
  
  const changeToEnglish = () => {
    i18n.changeLanguage('en');
  };
}
```

## Future Extensions

To support additional languages:

1. Add a new language object to the `resources` in `src/i18n.ts`
2. Update the language switcher component to include the new language
3. Add translations for all existing keys in the new language

Example for adding Finnish:
```typescript
// In src/i18n.ts
const resources = {
  sv: {
    // Swedish translations
  },
  en: {
    // English translations
  },
  fi: {
    translation: {
      // Finnish translations
      "welcome": "Tervetuloa BoklyAI:hin",
      // ...other translations
    }
  }
};
```

## Testing

To test the internationalization:

1. Start the development server: `npm start`
2. Check that the default language is Swedish
3. Use the language switcher to toggle between languages
4. Verify that all text elements change appropriately

## Best Practices

1. Always use translation keys instead of hardcoded strings
2. Keep translation keys consistent and descriptive
3. Maintain the same structure across all language files
4. Test the application in all supported languages
5. Consider text length differences when designing UI components