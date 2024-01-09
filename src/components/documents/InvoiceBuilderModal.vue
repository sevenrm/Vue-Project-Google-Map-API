<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue'
import { AddressViewModel, CompanyViewModel, InvoiceViewModel, KeyValuePairOfStringAndDouble, StoreFullViewModel } from '../../services/api.client'
import Modal from '../ui/Modal.vue'
import Datepicker from '@vuepic/vue-datepicker'
import { numberFormatter } from '../../services/number.formatter'

const emits = defineEmits(['close', 'save'])
const props = defineProps({
  isLoading: {
    type: Boolean,
    required: true
  },
  showCompanySettings: Boolean
})

const invoiceLocal = ref(InvoiceViewModel.fromJS({ detailsBreakdown: [], items: [], emittingCompany: CompanyViewModel.fromJS({ registeredAddress: new AddressViewModel() }), receivingCompany: CompanyViewModel.fromJS({ registeredAddress: new AddressViewModel() }) })!)

const invoiceTotal = computed(() => (invoiceLocal.value?.items?.filter(d => !isNaN(d.value))?.reduce((total, d) => total + d.value, 0) ?? 0))
const invoiceVatAmount = computed(() => (invoiceTotal.value * (invoiceLocal.value.vatAmount ?? 0) / 100))
const addNewRow = () => invoiceLocal.value?.items?.push(new KeyValuePairOfStringAndDouble())
const removeRow = (idx: number) => invoiceLocal.value!.items!.splice(idx, 1)
</script>
<style lang="scss">
.invoice-box {
  .dp__input {
    border: none !important;
  }

  .dp__input_icon_pad {
    text-align: right;
    padding-right: 0;
    font-weight: 500;
  }
}
</style>
<template>
  <Modal @close="$emit('close')" :is-loading="isLoading"
    :action-buttons="[{ text: 'save', action: () => $emit('save', invoiceLocal), iconName: 'content-save', colorClass: 'success' }]">
    <template v-slot:content>
      <div>
        <div class="invoice-box">
          <table>
            <tr class="top">
              <td colspan="2">
                <table>
                  <tr>
                    <td class="title" rowspan="3">
                      <img src="../../assets/images/logo-color.png" alt="Company logo"
                        style="width: 100%; max-width: 150px" />
                    </td>

                    <td class="title text-right">
                      {{ $tc('invoice') }}
                    </td>
                  </tr>
                  <tr>
                    <td class="text-right">
                      #INVOICEID
                    </td>
                  </tr>
                  <tr>
                    <td class="text-right">
                      <div class="flex items-end flex-col">
                        <span>{{ $tc('date') }}:</span>
                        <div>
                          <Datepicker v-model="invoiceLocal.date" class="w-32" :enableTimePicker="false"
                            :auto-apply="true" :format="'dd/MM/yyyy'">
                            <template #clear-icon="{}">
                            </template>
                          </Datepicker>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr class="information" v-if="showCompanySettings">
              <td>
                <table>
                  <tr>
                    <td>
                      <input type="text" class="outline-none p-1 -my-1"
                        v-model="invoiceLocal.emittingCompany!.legalName" />
                    </td>
                    <td>
                      <input type="text" class="text-right outline-none p-1 -my-1"
                        v-model="invoiceLocal.receivingCompany!.legalName" />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <input type="text" class="outline-none p-1 -my-1"
                        v-model="invoiceLocal.emittingCompany!.registeredAddress!.addressLine1" />
                    </td>
                    <td>
                      <input type="text" class="text-right outline-none p-1 -my-1"
                        v-model="invoiceLocal.receivingCompany!.registeredAddress!.addressLine1" />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <input type="text" class="outline-none p-1 -my-1"
                        v-model="invoiceLocal.emittingCompany!.registrationNumber" />
                    </td>
                    <td>
                      <input type="text" class="text-right outline-none p-1 -my-1"
                        v-model="invoiceLocal.receivingCompany!.registrationNumber" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table>
                  <tr class="heading">
                    <td @click="addNewRow" class="cursor-pointer">
                      <span class="mdi mdi-plus"></span>
                      {{ $tc('items') }}
                    </td>

                    <td>{{ $tc('amount') }}</td>
                  </tr>

                  <tr class="item" v-for="(_, idx) in invoiceLocal.items" :key="idx">
                    <td>
                      <div class="relative">
                        <span class="mdi mdi-delete-outline absolute -left-8 cursor-pointer"
                          @click="removeRow(idx)"></span>
                        <input type="text" class="p-2 -my-2 outline-none" v-model="invoiceLocal.items![idx].key" />
                      </div>
                    </td>

                    <td><input type="number" class="text-right p-2 -my-2 outline-none"
                        v-model="invoiceLocal.items![idx].value" />{{
                          numberFormatter.currencySymbol }}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td>
                      <table>
                        <tr class="last">
                          <td>{{ $tc('amount') }}</td>

                          <td>{{ numberFormatter.currency(invoiceTotal) }}</td>
                        </tr>
                        <tr class="last">
                          <td>{{ $tc('vat') }}</td>

                          <td>
                            <div>
                              <input type="number" class="p-1 text-right -my-1 outline-none"
                                v-model="invoiceLocal.vatAmount" />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                        <tr class="total">
                          <td>{{ $tc('total') }}</td>

                          <td>{{ numberFormatter.currency(invoiceTotal + invoiceVatAmount) }}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table>
                  <tr>
                    <td>
                      {{ $tc('notes') }}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <textarea class="w-64 outline-none" v-model="invoiceLocal.notes"></textarea>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      </div>
    </template>
  </Modal>
</template>
<style scoped>
/* Chrome, Safari, Edge, Opera */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Firefox */
input[type=number] {
  -moz-appearance: textfield;
}

@import url("https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap");

* {
  box-sizing: border-box;
  font-family: 'Poppins', Helvetica, Arial, sans-serif;
}

body {
  text-align: center;
  color: #777;
}

body h1 {
  font-weight: 300;
  margin-bottom: 0px;
  padding-bottom: 0px;
  color: #000;
}

body h3 {
  font-weight: 300;
  margin-top: 10px;
  margin-bottom: 20px;
  font-style: italic;
  color: #555;
}

body a {
  color: #06f;
}

.invoice-box {
  max-width: 800px;
  margin: auto;
  padding: 30px;
  font-size: 16px;
  line-height: 24px;
  color: #555;
}

.invoice-box table {
  width: 100%;
  line-height: inherit;
  text-align: left;
  border-collapse: collapse;
}

.invoice-box table td {
  padding: 5px;
  vertical-align: top;
}

.invoice-box table tr td:nth-child(2) {
  text-align: right;
}

.invoice-box table tr.top table td {
  padding-bottom: 20px;
}

.invoice-box table tr.top table td.title {
  font-size: 30px;
  line-height: 30px;
  color: #333;
}

.invoice-box table tr.heading td {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  text-transform: uppercase;
  font-weight: bold;
  padding-top: 21px;
  padding-bottom: 21px;
  border-bottom: 1px solid #f2f2f2;
}

.invoice-box table tr.details td {
  padding-bottom: 20px;
}

.invoice-box table tr.item td {
  padding-top: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f2f2f2;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  color: #707070;
}

.invoice-box table tr.item.last td {
  border-bottom: none;
}

.invoice-box table tr.total td:nth-child(2) {
  border-top: 2px solid #eee;
  font-weight: bold;
}

@media only screen and (max-width: 600px) {
  .invoice-box table tr.top table td {
    width: 100%;
    display: block;
    text-align: center;
  }

  .invoice-box table tr.information table td {
    width: 100%;
    display: block;
  }
}

.text-right {
  text-align: right;
}
</style>
