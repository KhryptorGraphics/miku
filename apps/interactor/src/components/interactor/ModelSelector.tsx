import classNames from 'classnames'
import { useAppContext } from '../../App.context'
import { useAppDispatch, useAppSelector } from '../../state/store'
import { ModelType } from '../../state/versioning'
import { Tooltip } from '@mikugg/ui-kit'
import { GiBrain } from 'react-icons/gi'
import { setModel } from '../../state/slices/settingsSlice'
import './ModelSelector.scss'

const ModelSelector = () => {
  const dispatch = useAppDispatch()
  const { isProduction, freeSmart } = useAppContext()
  const isPremium = useAppSelector((state) => state.settings.user.isPremium)
  const isSmart = useAppSelector(
    (state) => state.settings.model === ModelType.RP_SMART
  )
  const isMobileWidth = document.body.clientWidth < 768

  if (!isProduction) return null

  let tooltipMessage = ''

  if (!isPremium && !freeSmart) {
    tooltipMessage = '70B model is only available for premium users.'
  } else if (freeSmart) {
    tooltipMessage = isSmart
      ? 'Deactivate 70B'
      : 'Activate 70B model. Free for a limited time.'
  } else if (isPremium) {
    tooltipMessage = isSmart
      ? 'Deactivate 70B'
      : 'Activate 70B model. Makes the AI smarter.'
  }

  return (
    <div
      className={classNames({
        ModelSelector: true,
        'ModelSelector--activated': isSmart && (isPremium || freeSmart),
        'ModelSelector--disabled': !isPremium && !freeSmart,
      })}
    >
      <Tooltip id="smart-tooltip" place={isMobileWidth ? 'bottom' : 'left'} />
      <button
        className="ModelSelector__icon icon-button"
        onClick={() =>
          dispatch(setModel(isSmart ? ModelType.RP : ModelType.RP_SMART))
        }
        data-tooltip-id="smart-tooltip"
        data-tooltip-content={tooltipMessage}
      >
        <GiBrain />
      </button>
    </div>
  )
}

export default ModelSelector
