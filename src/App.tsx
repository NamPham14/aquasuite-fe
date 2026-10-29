import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { useAuthBootstrap } from './features/iam/hooks/useAuthBootstrap'

function App() {
  useAuthBootstrap()

  return <RouterProvider router={router} />
}

export default App
