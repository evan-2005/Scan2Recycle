import { useEffect, useState } from 'react'
import { fetchCatalog, type Catalog } from '../../lib/catalog'
import type { ItemType, Material, MaterialId } from '../../types'

export interface ReadyCatalog extends Catalog {
  labels: string[]
  itemsByLabel: ReadonlyMap<string, ItemType>
  materialsById: ReadonlyMap<MaterialId, Material>
}

export type CatalogState = { status: 'loading' } | { status: 'ready'; catalog: ReadyCatalog } | { status: 'error'; message: string }

function index(catalog: Catalog): ReadyCatalog {
  return {
    ...catalog,
    labels: catalog.itemTypes.map((item) => item.label),
    itemsByLabel: new Map(catalog.itemTypes.map((item) => [item.label, item])),
    materialsById: new Map(catalog.materials.map((material) => [material.id, material])),
  }
}

/** Loads the item and material lists from Supabase once per page visit. */
export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchCatalog().then((result) => {
      if (cancelled) return
      setState(result.ok ? { status: 'ready', catalog: index(result.value) } : { status: 'error', message: result.error })
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
