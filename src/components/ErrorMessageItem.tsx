import IconRefresh from './icons/Refresh'

interface Props {
  message: string
  onRetry?: () => void
}

export default (props: Props) => (
  <div class="my-3 rounded-xl px-4 py-3 border border-red-300/60 bg-red-50 dark:(bg-red-900/20 border-red-500/30)" role="alert">
    <div class="text-sm text-red-700 dark:text-red-300">{props.message}</div>
    {props.onRetry && (
      <button onClick={props.onRetry} class="mt-2 chip bg-red-100 text-red-700 dark:(bg-red-900/40 text-red-200) cursor-pointer">
        <IconRefresh /> Try again
      </button>
    )}
  </div>
)
