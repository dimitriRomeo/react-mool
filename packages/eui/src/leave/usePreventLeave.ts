import { ReactNode, useCallback, useEffect, useRef } from "react"
import { useHistory, useLocation } from "react-router"
import { useFreshRef } from "rooks"
import { ConfirmationOptions, useConfirmLeave } from "../confirm"
import { logError } from "../helpers/console"

function applyHistoryAction(
  history: ReturnType<typeof useHistory>,
  location: ReturnType<typeof useLocation>,
  action: "PUSH" | "POP" | "REPLACE"
) {
  switch (action) {
    case "PUSH":
      history.push(location)
      break

    case "REPLACE":
      history.replace(location)
      break

    case "POP":
      history.goBack()
      break

    default:
      logError(`Unknown history action: ${action}`)
  }
}

export type UsePreventLeaveOptions = {
  when: () => boolean
  confirmMessage?: ReactNode
  confirmOptions?: ConfirmationOptions
}

export function usePreventLeave(options: UsePreventLeaveOptions) {
  const { when, confirmMessage, confirmOptions } = options

  const confirmLeave = useConfirmLeave(confirmOptions)
  const history = useHistory()
  const whenRef = useFreshRef(when)
  const confirmMessageRef = useFreshRef(confirmMessage)
  const allowLeaveOnceRef = useRef(false)

  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      const shouldBlock = whenRef.current?.()
      if (shouldBlock) {
        event.preventDefault()
        event.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", listener)

    return () => window.removeEventListener("beforeunload", listener)
  }, [])

  const maybeAskConfirm = useCallback(
    (nextAction: () => void) => {
      const shouldBlock = whenRef.current?.()
      const shouldAllow = allowLeaveOnceRef.current

      if (shouldAllow) {
        allowLeaveOnceRef.current = false
        return false
      }

      if (shouldBlock) {
        confirmLeave(confirmMessageRef.current).then((ok) => {
          if (ok) {
            allowLeaveOnceRef.current = true
            nextAction()
          }
        })
      }

      return shouldBlock
    },
    [confirmLeave]
  )

  const allowLeaveOnce = useCallback((allow: boolean = true) => {
    allowLeaveOnceRef.current = allow
  }, [])

  useEffect(() => {
    return history.block((location, action) => {
      const shouldBlock = maybeAskConfirm(() => {
        applyHistoryAction(history, location, action)
      })
      return shouldBlock ? false : undefined
    })
  }, [history, maybeAskConfirm])

  return {
    maybeAskConfirm,
    allowLeaveOnce,
  }
}
