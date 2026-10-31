import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useAuthBootstrap } from './features/iam/hooks/useAuthBootstrap'

/** Khởi chạy khôi phục phiên một lần ở gốc trước khi các guard quyết định nội dung route. */
function App() {
  useAuthBootstrap()

  return <RouterProvider router={router} />
}

export default App
