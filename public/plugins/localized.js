import Vue from 'vue'

Vue.filter('localized', function (prop, locale = 'fr') {
  if (prop && typeof prop === 'object') return prop[locale] || prop.fr
  return prop
})
