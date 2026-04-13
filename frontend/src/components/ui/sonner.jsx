import { Toaster as SonnerToaster } from "sonner"

export const Toaster = ({ ...props }) => (
  <SonnerToaster theme="light" position="top-right" {...props} />
)
