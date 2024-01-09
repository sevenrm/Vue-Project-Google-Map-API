<script lang="ts" setup>
import { onMounted, Ref, ref } from 'vue'
import { useToast } from 'vue-toastification'
import { apiClient } from '../../services/api'
import { LanguageInfoViewModel, LegalAgreementViewModel } from '../../services/api.client'
import { ModalSize } from '../../components/ui/types'
import Modal from '../../components/ui/Modal.vue'
import TableBuilder from '../../components/ui/TableBuilder.vue'
import { pageContentHeight, pageContentHeightPx } from '../../services/utils'
import LoadingButton from '../../components/ui/LoadingButton.vue'
import { store } from '../../services/store'
import { notifier } from '../../services/notification'
import ScrollableDiv from '../../components/ui/ScrollableDiv.vue'

const isLoading = ref(false)
const agreements: Ref<LegalAgreementViewModel[]> = ref([])
const selectedAgreement: Ref<LegalAgreementViewModel | undefined> = ref(undefined)

const loadAgreements = async () => {
  try {
    isLoading.value = true
    agreements.value = await apiClient.globalAgreementsGet()
  } catch (error) {
    notifier.notifyError('loading', error, 'agreements')
  }
  isLoading.value = false
}

const loadAgreementById = async (id: string) => {
  selectedAgreement.value = await apiClient.globalAgreement(id)
}

const selectedContentType: Ref<'html' | 'text'> = ref('html')
const selectedLanguageCode = ref('en')
const save = async () => {
  try {
    isLoading.value = true
    await apiClient.globalAgreementsPost(selectedAgreement.value!)
    notifier.notifySuccess('saved', 'agreement')
  } catch (error) {
    notifier.notifyError('saving', error, 'agreements')
  }
  isLoading.value = false
}

const changeLanguage = (lang: string) => {
  if (!selectedAgreement.value) return
  if (!selectedAgreement.value.languageInfos![lang])
    selectedAgreement.value.languageInfos![lang] = new LanguageInfoViewModel()
  selectedLanguageCode.value = lang
}

const addNew = () => {
  selectedAgreement.value = new LegalAgreementViewModel()
  selectedAgreement.value.languageInfos = { en: new LanguageInfoViewModel() }
}

onMounted(() => {
  loadAgreements()
})
</script>
<template>
  <div>
    <Modal @close="selectedAgreement = undefined" :size="ModalSize.Large" v-if="selectedAgreement" :show-close-only="true"
      :show-footer="false">
      <template v-slot:content>
        <div class="w-full flex flex-col">
          <div class="flex">
            <div>
              <LoadingButton :is-loading="isLoading" :is-disabled="isLoading" class="btn-action" @click="save">
                Save
              </LoadingButton>
            </div>
            <div>
              <Popper hover arrow closeDelay="100" class="ml-3">
                <button
                  class="w-auto rounded-default p-2 hover:bg-white flex relative items-center justify-center text-white hover:text-red-pnp transition-colors duration-150">
                  <span class="fi mr-2 rounded" :class="['fi-' + selectedLanguageCode]"></span>
                  <span class="mdi mdi-chevron-down absolute right-0"></span>
                </button>
                <template #content>
                  <div
                    class="border-gray-200 z-10 -mt-3 text-base list-none rounded-default divide-y border divide-gray-100 shadow-default bg-white dark:bg-gray-720 dark:border-gray-720">
                    <ul class="py-1" aria-labelledby="dropdownButton">
                      <li v-for="locale in store.languages.value" :key="`locale-${locale.code}`" :value="locale.code"
                        @click="changeLanguage(locale.code)"
                        :class="{ 'text-red-pnp': selectedLanguageCode === locale.code, 'text-gray-body': selectedLanguageCode !== locale.code }"
                        class="cursor-pointer px-3 py-2 text-base hover:text-red-pnp font-semibold hover:bg-gray-100 transition-colors duration-150">
                        <span class="fi mr-2 rounded" :class="['fi-' + locale.code]"></span>
                        <span class="font-bold uppercase">{{ locale.name }}</span>
                      </li>
                    </ul>
                  </div>
                </template>
              </Popper>
            </div>
          </div>
          <!-- <ckeditor :editor="ClassicEditor" v-model="selectedAgreement.languageInfos![selectedLanguageCode].description"
              :config="{
                htmlSupport: {
                  allow: [
                    {
                      name: /.*/,
                      attributes: true,
                      classes: true,
                      styles: true
                    }
                  ]
                }
              }"></ckeditor> -->
          <textarea v-model="selectedAgreement.languageInfos![selectedLanguageCode].description"></textarea>
        </div>
      </template>
    </Modal>
    <div class="w-full">
      <h1 class="page-title flex justify-between">
        <span>{{ $tc(`routes.${$route.meta.title}`) }}</span>
        <button @click="addNew" class="btn-action">{{ $tc('addNew') }}</button>
      </h1>
      <ScrollableDiv class="page-content" :height="pageContentHeight">
        <TableBuilder :items="agreements" :is-loading="isLoading">
          <template v-slot:thead>
            <tr class="border-b">
              <th class="py-4 font-medium text-gray-400">Id</th>
              <th class="py-4 font-medium text-gray-400">{{ $tc('country') }} #</th>
              <th class="py-4 font-medium text-gray-400">{{ $tc('publishedAt') }}</th>
              <th class="py-4 font-medium text-gray-400">{{ $tc('createdAt') }}</th>
            </tr>
          </template>
          <template v-slot:item="{ item } : { item: any }">
            <tr class="border-b hover:bg-gray-100 cursor-pointer" @click="loadAgreementById(item.id)">

              <td class="text-center py-2 text-gray-body">
                <span>{{ item.id?.split('-')[0] }}</span>
              </td>
              <td class="text-center py-2">
                <span>{{ item.countryId }}</span>
              </td>
              <td class="text-center py-2">
                <span>{{ item.publishedAt }}</span>
              </td>
              <td class="text-center py-2">
                <span>{{ item.createdAt }}</span>
              </td>
            </tr>
          </template>
        </TableBuilder>
      </ScrollableDiv>
    </div>
  </div>
</template>
