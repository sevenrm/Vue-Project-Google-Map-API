import { apiClient } from './api'
import { MenuCategoryViewModel, MenuAttributeGroupViewModel, MenuAttributeItemViewModel, MenuItemViewModel, MenuViewModel } from './api.client'

export type MenuMappings = {
  menu: MenuViewModel
  categoriesMapping: Record<string, MenuCategoryViewModel>
  menuItemsMapping: Record<string, MenuItemViewModel>
  menuItemAttributeGroupMapping: Record<string, MenuAttributeGroupViewModel>
  menuItemAttributeMapping: Record<string, MenuAttributeItemViewModel>
}

export const loadMenuMappings = async (restaurantId: string, loadHidden?: boolean): Promise<MenuMappings | undefined> => {
  const menu = await apiClient.menuMappings(restaurantId, loadHidden)
  return buildMenuMap(menu)
}

export const buildMenuMap = (menu: MenuViewModel): MenuMappings | undefined => {
  if (!menu) return
  const categoriesMapping: Record<string, MenuCategoryViewModel> = {}
  const menuItemsMapping: Record<string, MenuItemViewModel> = {}
  const menuItemAttributeGroupMapping: Record<string, MenuAttributeGroupViewModel> = {}
  const menuItemAttributeMapping: Record<string, MenuAttributeItemViewModel> = {}
  for (const attributeGroup of menu.attributeGroups)
    menuItemAttributeGroupMapping[attributeGroup.id!] = attributeGroup
  for (const attribute of menu.attributes)
    menuItemAttributeMapping[attribute.id!] = attribute
  for (const category of menu.categories!)
    categoriesMapping[category.id!] = category
  for (const item of menu.menuItems)
    menuItemsMapping[item.id!] = item
  return { menu, categoriesMapping, menuItemsMapping, menuItemAttributeGroupMapping, menuItemAttributeMapping }
}
