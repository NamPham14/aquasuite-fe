import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { Toaster } from 'sonner'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
    <Toaster richColors position="top-right" />
  </Provider>,
)
