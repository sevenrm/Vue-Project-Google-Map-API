<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue'
import { environment } from '../../environment'
import { GoogleMap, Marker, Polygon, InfoWindow, Circle } from 'vue3-google-map'
import { useScriptTag } from '@vueuse/core'
import { title } from 'process'
import { EMOTICON_OPTIONS } from 'emojibase'

const center = { lat: 40.689247, lng: -74.044502 }
const libLoaded = ref(false)
const mapRef = ref()

const props = defineProps({
  polygons: {
    type: Array,
    require: true
  },
  circles: {
    type: Array,
    require: true
  }
})

const emits = defineEmits(['update:polygonArray', 'update:polygonCenter', 'update:circle'])

useScriptTag(`https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}&libraries=drawing`, () => libLoaded.value = true)

watch(() => mapRef.value?.ready, (ready) => {
  if (!ready) return
  const { google } = window as any
  const myDrawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: null,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [google.maps.drawing.OverlayType.POLYGON, google.maps.drawing.OverlayType.CIRCLE]
    },
    circleOptions: {
      fillColor: '#cccccc',
      fillOpacity: 0.5,
      strokeColor: '#000000',
      clickable: true,
      editable: true,
      draggable: true,
      zIndex: 1
    },
    polygonOptions: {
      clickable: true,
      draggable: true,
      editable: true,
      fillColor: '#cccccc',
      fillOpacity: 0.5,
      strokeColor: '#000000'
    }
  })
  console.log(mapRef.value)
  myDrawingManager.setMap(mapRef.value.map)
  google.maps.event.addListener(myDrawingManager, 'polygoncomplete', function (polygon: any) {
    console.log(polygon)
    const currentPolygon: { lat: number, lng: number }[] = []
    // eslint-disable-next-line array-callback-return
    polygon.getPath().g.map((value: any) => {
      currentPolygon.push({
        lat: value.lat(),
        lng: value.lng()
      })
    })
    emits('update:polygonArray', currentPolygon)
    // emits('update:polygonCenter', { lat: polygon.getCenter().lat(), lng: polygon.getCenter().lng() })
    console.log('~~~~~~~~polygon~~~~~~~~~~', props.polygons)
  })
  google.maps.event.addListener(myDrawingManager, 'circlecomplete', function (circle: any) {
    console.log(circle)
    emits('update:circle', { center: { lat: circle.center.lat(), lng: circle.center.lng() }, radius: circle.radius })
  })
})

</script>
<template>
  <GoogleMap v-if="libLoaded" ref="mapRef" :api-key="environment.googleMapsApiKey" style="width: 100%; height: 500px"
             :center="center" :zoom="15">
    <template #default="{ ready, api, map, mapTilesLoaded }">
      <Marker :options="{ position: center }" />
      <template v-for="polygon of  props.polygons " :key="polygon.id">
        <Polygon :options="polygon.polygon" />
        <InfoWindow
                    :options="{ position: polygon?.polygon[1], content: ('Cost: ' + polygon?.cost + '   ' + 'Estimated Time: ' + polygon?.estimatedTime.hours + '.' + polygon?.estimatedTime.minutes) }" />
      </template>
      <template v-for="circle of  props.circles " :key="circle.id">
        <Circle :options="circle.circle" />
        <InfoWindow
                    :options="{ position: circle.circle.center, content: ('Cost: ' + circle?.cost + '   ' + 'Estimated Time: ' + circle?.estimatedTime.hours + '.' + circle?.estimatedTime.minutes) }" />
      </template>
    </template>
  </GoogleMap>
</template>
