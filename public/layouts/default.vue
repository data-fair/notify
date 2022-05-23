<template>
  <v-app>
    <v-app-bar
      v-if="user"
      app
      fixed
      dense
      flat
    >
      <div class="logo-container">
        <nuxt-link
          :to="localePath('index')"
          title="Accueil"
        >
          <img
            v-if="env.theme.logo"
            :src="env.theme.logo"
          >
          <img
            v-else
            src="../static/logo.svg"
          >
        </nuxt-link>
      </div>
      <v-spacer />
      <v-toolbar-items>
        <v-tabs
          centered
          grow
          show-arrows
          dense
          background-color="transparent"
        >
          <v-tabs-slider color="accent" />
          <v-tab
            :to="localePath({name:'subscriptions'})"
            color="transparent"
          >
            Souscriptions
            <v-icon class="mx-4">
              mdi-routes
            </v-icon>
          </v-tab>
          <v-tab :to="localePath({name:'webhook-subscriptions'})">
            Webhooks
            <v-icon class="mx-4">
              mdi-webhook
            </v-icon>
          </v-tab>
          <v-tab :to="localePath({name:'notifications'})">
            Notifications
            <v-icon class="mx-4">
              mdi-bell
            </v-icon>
          </v-tab>
          <v-tab :to="localePath({name:'push-registrations'})">
            Appareils
            <v-icon class="mx-4">
              mdi-devices
            </v-icon>
          </v-tab>
        </v-tabs>
      </v-toolbar-items>
      <v-spacer />
      <personal-menu>
        <template
          v-if="user.adminMode"
          #actions-before="{}"
        >
          <v-subheader>Administration</v-subheader>
          <v-list-item to="/admin/global-topics">
            <v-list-item-title>Sujets globaux</v-list-item-title>
          </v-list-item>
          <v-divider />
        </template>
      </personal-menu>
      <lang-switcher class="ml-2" />
    </v-app-bar>

    <v-main>
      <notifications />
      <nuxt v-if="user" />
      <v-container
        v-else
        class="text-center pt-12"
      >
        <v-btn
          color="primary"
          @click="$store.dispatch('session/login')"
        >
          Se connecter
        </v-btn>
      </v-container>
    </v-main>

    <v-footer
      v-if="$route.name !== 'cartographie'"
      dark
    >
      <v-col
        class="text-center"
        cols="12"
      >
        &copy; <a
          href="http://koumoul.com"
          target="_blank"
        >Koumoul</a>
      </v-col>
    </v-footer>
  </v-app>
</template>

<script>
import Notifications from '../components/notifications.vue'
import PersonalMenu from '@data-fair/sd-vue/src/vuetify/personal-menu.vue'
import LangSwitcher from '@data-fair/sd-vue/src/vuetify/lang-switcher.vue'
import { mapState, mapGetters } from 'vuex'

export default {
  components: { Notifications, PersonalMenu, LangSwitcher },
  data () {
    return {
      uptimeUrl: process.env.uptimeUrl
    }
  },
  computed: {
    ...mapState(['env']),
    ...mapState('session', ['user']),
    ...mapGetters('session', ['activeAccount'])
  },
  methods: {
    logout () {
      this.$store.dispatch('session/logout')
      this.$store.dispatch('session/login')
    },
    switchOrganization (orgId) {
      this.$store.dispatch('session/switchOrganization', orgId)
      window.location.reload()
    }
  }
}
</script>

<style>
.v-app-bar .logo-container {
  height: 100%;
  padding: 4px;
  margin-left: 4px !important;
  margin-right: 4px;
  width: 64px;
}

body .v-application .logo-container img, body .v-application .logo-container svg {
  height:100%;
}
</style>
