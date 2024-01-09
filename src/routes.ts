import { reactive } from 'vue'
import { createRouter, createWebHistory, RouteRecordRaw, useRoute } from 'vue-router'

import { environment } from './environment'
import { PlatformPermissionEnum } from './services/api.client'
import { store } from './services/store'
import NotFound from './views/NotFound.vue'
import PassThrough from './views/PassThrough.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('./views/Login.vue'),
    name: 'login',
    meta: { title: 'Login' }
  },
  {
    path: '/checkout-confirm/:providerId',
    name: 'checkout-confirm',
    props: true,
    component: () => import('./views/CheckoutConfirm.vue')
  },
  {
    path: '/delivery',
    children: [
      {
        path: '',
        component: () => import('./views/Delivery.vue'),
        name: 'delivery',
        meta: { title: 'delivery' }
      }
    ]
  },
  {
    path: '/restaurant/:restaurantId',
    component: PassThrough,
    children: [
      {
        path: '',
        component: () => import('./views/Home.vue'),
        name: 'home',
        props: true,
        meta: { title: 'home' }
      },
      {
        path: 'orders',
        component: PassThrough,
        props: true,
        children: [
          {
            path: 'list',
            name: 'orders-list',
            props: true,
            component: () => import('./views/Orders.vue'),
            meta: { title: 'orders' }
          },
          {
            path: 'history',
            component: PassThrough,
            children: [
              {
                path: '',
                name: 'orders-history',
                props: true,
                component: () => import('./views/History.vue'),
                meta: { title: 'history' }
              },
              {
                path: 'order/:orderId',
                name: 'order-detail',
                props: true,
                component: () => import('./views/OrderDetail.vue'),
                meta: { title: 'orderDetail' }
              },
              {
                path: 'orders-account/:ordersAccountId',
                name: 'orders-account-detail',
                props: true,
                component: () => import('./views/OrderDetail.vue'),
                meta: { title: 'ordersAccountDetail' }
              }
            ]
          }
        ]
      },
      {
        path: 'notifications',
        name: 'notifications',
        props: true,
        component: () => import('./views/Notifications.vue'),
        meta: { title: 'notifications' }
      },
      {
        path: 'shifts',
        name: 'shifts',
        props: true,
        component: () => import('./views/Shifts.vue'),
        meta: { title: 'shifts' }
      },
      {
        path: 'bookings',
        name: 'bookings',
        props: true,
        component: () => import('./views/Bookings.vue'),
        meta: { title: 'bookings' }
      },
      {
        path: 'customers',
        name: 'customers',
        props: true,
        component: () => import('./views/Customers.vue'),
        meta: { title: 'customers' }
      },
      {
        path: 'menus',
        name: 'menus',
        props: true,
        component: () => import('./views/Menus.vue'),
        meta: { title: 'menus' }
      },
      {
        path: 'menus/:id',
        name: 'menu-details',
        props: true,
        component: () => import('./views/MenuDetail.vue'),
        meta: { title: 'menu' }
      },
      {
        path: 'tables',
        name: 'tables',
        props: true,
        component: () => import('./views/Tables.vue'),
        meta: { title: 'tables' }
      },
      {
        path: 'campaigns',
        name: 'campaigns',
        props: true,
        component: () => import('./views/Campaigns.vue'),
        meta: { title: 'campaigns' }
      },
      {
        path: 'reports',
        name: 'reports',
        props: true,
        component: () => import('./views/Reports.vue'),
        meta: { title: 'reports' }
      },
      {
        path: 'documents',
        children: [
          {
            path: '',
            props: true,
            name: 'documents',
            component: () => import('./views/Documents.vue'),
            meta: { title: 'documents' }
          }, {
            path: ':id',
            props: true,
            name: 'document-details',
            component: () => import('./views/DocumentDetail.vue'),
            meta: { title: 'documentDetail' }
          }
        ]
      },
      {
        path: 'receipts',
        name: 'receipts',
        props: true,
        component: () => import('./views/Receipts.vue'),
        meta: { title: 'receipts' }
      },
      {
        path: 'cash-takings',
        name: 'cash-takings',
        props: true,
        component: () => import('./views/CashTakings.vue'),
        meta: { title: 'cashTakings' }
      },
      // {
      //   path: 'transactions',
      //   name: 'transactions',
      //   props: true,
      //   component: () => import('./views/Transactions.vue'),
      //   meta: { title: 'transactions' }
      // },
      {
        path: 'vouchers',
        component: PassThrough,
        children: [
          {
            path: '',
            props: true,
            name: 'vouchers',
            component: () => import('./views/Vouchers.vue'),
            meta: { title: 'vouchers' }
          },
          {
            path: ':id',
            name: 'voucher-details',
            props: true,
            component: () => import('./views/VoucherDetail.vue'),
            meta: { title: 'voucherDetails' }
          }
        ]
      },
      {
        path: 'inventory',
        children: [
          {
            props: true,
            path: '',
            name: 'inventory',
            component: () => import('./views/Inventory.vue'),
            meta: { title: 'inventory' }
          },
          {
            path: ':id',
            name: 'inventory-details',
            props: true,
            component: () => import('./views/InventoryDetail.vue'),
            meta: { title: 'inventoryDetails' }
          }
        ]
      },
      {
        path: 'margins',
        children: [
          {
            props: true,
            path: '',
            name: 'margins',
            component: () => import('./views/Margins.vue'),
            meta: { title: 'margins' }
          },
          {
            path: ':id',
            name: 'margins-details',
            props: true,
            component: () => import('./views/InventoryDetail.vue'),
            meta: { title: 'marginsDetails' }
          }
        ]
      },
      {
        path: 'devices',
        name: 'devices',
        props: true,
        component: () => import('./views/Devices.vue'),
        meta: { title: 'devices' }
      },
      {
        path: 'billing',
        name: 'billing',
        props: true,
        component: () => import('./views/Billing.vue'),
        meta: { title: 'billing' }
      },
      {
        path: 'suppliers',
        component: PassThrough,
        children: [
          {
            path: '',
            name: 'restaurant-suppliers',
            props: true,
            component: () => import('./views/RestaurantSuppliers.vue'),
            meta: { title: 'suppliers' }
          },
          {
            path: ':id',
            component: PassThrough,
            children: [
              {
                path: '',
                props: true,
                name: 'supplier-details',
                component: () => import('./views/SupplierDetails.vue'),
                meta: { title: 'supplierDetails' }
              },
              {
                path: 'products',
                name: 'products',
                props: true,
                component: () => import('./views/SupplierProducts.vue'),
                meta: { title: 'supplierProducts' }
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/Settings.vue'),
    meta: { title: 'settings' }
  },
  {
    path: '/admin',
    component: PassThrough,
    children: [
      {
        path: 'restaurants',
        name: 'admin-restaurants',
        component: () => import('./views/Admin/AdminStores.vue'),
        meta: { title: 'restaurants' }
      },
      {
        path: 'admin-activity-log',
        name: 'admin-activity-log',
        component: () => import('./views/Admin/AdminActivityLog.vue'),
        meta: { title: 'activityLog' }
      },
      {
        name: 'admin-restaurant-manager',
        path: 'restaurants/:id',
        props: true,
        component: () => import('./views/Admin/AdminManageStore.vue'),
        meta: { title: 'ManageStore' }
      },
      {
        name: 'admin-users',
        path: 'users',
        component: () => import('./views/Admin/AdminUsers.vue'),
        meta: { title: 'users' }
      },
      {
        name: 'admin-roles',
        path: 'roles',
        component: () => import('./views/Admin/AdminRoles.vue'),
        meta: { title: 'roles' }
      },
      {
        name: 'admin-agreements',
        path: 'agreements',
        component: () => import('./views/Admin/AdminAgreements.vue'),
        meta: { title: 'agreements' }
      },
      {
        name: 'admin-global',
        path: 'global',
        component: () => import('./views/Admin/AdminGlobal.vue'),
        meta: { title: 'global' }
      }
    ]
  },
  { path: '/:path(.*)', component: NotFound }
]

export const router = createRouter({
  history: createWebHistory(environment.baseDirectory),
  routes
})

export interface IMenuItem {
  active: boolean,
  copy: string
  link?: string // TODO remove
  icon?: string
  basePath?: string,
  children?: IMenuItem[],
  parent?: IMenuItem
  roles?: PlatformPermissionEnum[],
  routeName?: string
  isBeta?: boolean
}

export const menuItems: IMenuItem[] = reactive([
  {
    active: false,
    link: '/',
    copy: 'home',
    icon: 'home-outline',
    routeName: 'home'
  },
  {
    active: false,
    link: '/orders',
    copy: 'orders',
    icon: 'format-list-text',
    routeName: 'orders-list',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore,
      PlatformPermissionEnum.HandleOrders
    ]
  },
  {
    active: false,
    link: '/orders/history',
    copy: 'history',
    icon: 'clipboard-text-clock',
    routeName: 'orders-history',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore,
      PlatformPermissionEnum.ViewOrders
    ]
  },
  {
    active: false,
    link: '/restaurant/receipts',
    copy: 'receipts',
    icon: 'cash-multiple',
    routeName: 'receipts',
    roles: [PlatformPermissionEnum.ManageStore]
  },
  {
    active: false,
    link: '/restaurant/cash-takings',
    copy: 'cashTakings',
    icon: 'cash-register',
    routeName: 'cash-takings',
    roles: [PlatformPermissionEnum.ManageStore]
  },
  {
    active: false,
    link: '/restaurant/menus',
    copy: 'menus',
    icon: 'food-outline',
    routeName: 'menus',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore,
      PlatformPermissionEnum.ManageCatalog
    ]
  },
  {
    active: false,
    link: '/restaurant/tables',
    copy: 'tables',
    icon: 'table-chair',
    routeName: 'tables',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    isBeta: true,
    active: false,
    link: '/bookings',
    copy: 'bookings',
    icon: 'calendar',
    routeName: 'bookings',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    active: false,
    link: '/customers',
    copy: 'customers',
    icon: 'account-group',
    routeName: 'customers',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    active: false,
    link: '/restaurant/campaigns',
    copy: 'campaigns',
    icon: 'bullhorn-variant-outline',
    routeName: 'campaigns',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    active: false,
    link: '/restaurant/reports',
    copy: 'reports',
    icon: 'finance',
    routeName: 'reports',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore,
      PlatformPermissionEnum.ViewReports
    ]
  },
  {
    active: false,
    link: '/restaurant/documents',
    text: 'invoice log',
    copy: 'documents',
    icon: 'file-document',
    routeName: 'documents',
    roles: [
      PlatformPermissionEnum.ViewDocuments,
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.CreateStore,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    isBeta: true,
    active: false,
    link: '/restaurant/inventory',
    text: 'inventory',
    copy: 'inventory',
    icon: 'warehouse',
    routeName: 'inventory',
    roles: [
      PlatformPermissionEnum.ManageInventory,
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    isBeta: true,
    active: false,
    link: '/restaurant/margins',
    text: 'margins',
    copy: 'margins',
    icon: 'chart-arc',
    routeName: 'margins',
    roles: [
      PlatformPermissionEnum.ManageInventory,
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    isBeta: true,
    active: false,
    link: '/restaurant/vouchers',
    text: 'vouchers',
    copy: 'vouchers',
    icon: 'ticket-percent',
    routeName: 'vouchers',
    roles: [
      PlatformPermissionEnum.ManageVouchers,
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    active: false,
    link: '/restaurant/devices',
    copy: 'devices',
    icon: 'cellphone-link',
    routeName: 'devices',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.CreateStore,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    active: false,
    link: '/restaurant/billing',
    copy: 'billing',
    icon: 'cash-clock',
    routeName: 'billing',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.CreateStore,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    isBeta: true,
    active: false,
    link: '/suppliers',
    text: 'suppliers',
    copy: 'suppliers',
    icon: 'human-dolly',
    routeName: 'restaurant-suppliers',
    roles: [
      PlatformPermissionEnum.ManageSupplier,
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    isBeta: true,
    active: false,
    link: '/shifts',
    text: 'shifts',
    copy: 'shifts',
    icon: 'table-clock',
    routeName: 'shifts',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.ManageStore
    ]
  },

  {
    active: false,
    link: '/admin/restaurants',
    copy: 'restaurants',
    icon: 'store',
    routeName: 'admin-restaurants',
    roles: [
      PlatformPermissionEnum.Admin
    ]
  },
  {
    active: false,
    link: '/admin/users',
    copy: 'users',
    icon: 'account-hard-hat',
    routeName: 'admin-users',
    roles: [
      PlatformPermissionEnum.Admin,
      PlatformPermissionEnum.CreateStore,
      PlatformPermissionEnum.ManageStore
    ]
  },
  {
    active: false,
    link: '/admin/activity-log',
    copy: 'activity-log',
    icon: 'archive-search',
    routeName: 'admin-activity-log',
    roles: [PlatformPermissionEnum.SuperAdmin]
  },
  {
    active: false,
    link: '/admin/roles',
    copy: 'roles',
    icon: 'shield-account',
    routeName: 'admin-roles',
    roles: [PlatformPermissionEnum.SuperAdmin]
  },
  {
    active: false,
    link: '/admin/global',
    copy: 'global',
    icon: 'crown',
    routeName: 'admin-global',
    roles: [PlatformPermissionEnum.SuperAdmin]
  }
])

const findNestedRoute = (routeLink: string, basePath: string, items: IMenuItem[], parent?: IMenuItem | undefined): IMenuItem | undefined => {
  for (const item of items) {
    item.parent = parent
    if ((basePath + item.link) === routeLink)
      return item
    else if (item.children) {
      const found = findNestedRoute(routeLink, (basePath + item.basePath), item.children, item)
      if (found)
        return found
    }
  }
  return undefined
}

const canAccess = (menuItem: IMenuItem, userPermissions: PlatformPermissionEnum[]): boolean => {
  if (menuItem.roles !== undefined && !userPermissions.some(x => menuItem!.roles!.indexOf(x) > -1) && !userPermissions.includes(1))
    return false
  if (menuItem.parent)
    return canAccess(menuItem.parent, userPermissions)
  return true
}

router.beforeEach(async (to, from, next) => {
  if (to.name === 'checkout-confirm' || to.params.path === 'checkout-confirm')
    next()
  if (to.name !== 'login' && !store.canUserAccess)
    next({ name: 'login' })
  else if (to.name === 'login' && store.canUserAccess)
    next({ name: 'home', params: { restaurantId: store.user.value?.restaurants[0].id } })
  // TODO review
  else {
    if (!store.user.value)
      await store.userLoaded
    const route = findNestedRoute(to.path, '', menuItems)
    if (route && !canAccess(route, store.user.value!.role.permissions)) {
      next({ name: 'home', params: { restaurantId: store.user.value?.restaurants[0].id } })
      return
    }
    if (typeof to.matched[to.matched.length - 1].components?.default === 'function')
      store.isLoadingPage.value = true
    next()
  }
})

router.beforeResolve((to, from, next) => {
  store.isLoadingPage.value = false
  next()
})
