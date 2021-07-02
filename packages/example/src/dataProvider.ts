import { DataProvider } from "@react-mool/core"
import { selectFields } from "gqless"
import pluralize from "pluralize"
import { client, resolved } from "./gqless"

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.substring(1)
}

const todo = () => Promise.reject(new Error("Not implemented"))

export const dataProvider: DataProvider = {
  id: (_resource, record) => record.id,
  getOne: async (resource, params) => {
    return await resolved(() => {
      const record = (client.query as any)[capitalize(resource)]({
        id: String(params.id),
      })
      return selectFields(record, "*", 2)
    })
  },
  getList: async (
    resource,
    { page: pageParam, pageSize, sortField, sortOrder, filter }
  ) => {
    const page = pageParam - 1
    return await resolved(() => {
      const items = (client.query as any)[`all${capitalize(pluralize(resource))}`]({
        page,
        perPage: pageSize,
        sortField,
        sortOrder,
        filter,
      })

      const total = (client.query as any)[`_all${capitalize(pluralize(resource))}Meta`]({
        page,
        perPage: pageSize,
        filter,
      })?.count

      return {
        items: selectFields(items, "*", 2),
        total,
      }
    })
  },
  create: todo,
  update: todo,
  delete: todo,
}
