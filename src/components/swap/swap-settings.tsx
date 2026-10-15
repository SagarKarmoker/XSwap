import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DEFAULT_DEADLINE_MINUTES } from '@/state/swap-context'

const SLIPPAGE_PRESETS = [10, 50, 100]
const DEADLINE_PRESETS = [10, 20, 30, 60]

/** Slippage tolerance and transaction deadline — both persisted across sessions. */
export function SwapSettingsDialog({
  open,
  onClose,
  slippageBps,
  deadlineMinutes,
  onSlippageChange,
  onDeadlineChange,
}: {
  open: boolean
  onClose: () => void
  slippageBps: number
  deadlineMinutes: number
  onSlippageChange: (bps: number) => void
  onDeadlineChange: (minutes: number) => void
}) {
  const [customSlippage, setCustomSlippage] = useState('')
  const [customDeadline, setCustomDeadline] = useState('')

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Swap settings"
      description="Slippage becomes the on-chain minimum received. Deadline is how long the transaction stays valid."
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="slippage" className="text-body font-w535 text-midnight-ink">
              Slippage tolerance
            </label>
            <span className="tnum text-body-sm text-slate">
              {(slippageBps / 100).toFixed(2)}%
              {slippageBps > 150 ? <span className="ml-2 text-crimson">high risk</span> : null}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2">
            {SLIPPAGE_PRESETS.map((bps) => (
              <Button
                key={bps}
                variant={slippageBps === bps ? 'soft' : 'outline'}
                onClick={() => {
                  onSlippageChange(bps)
                  setCustomSlippage('')
                }}
                className="w-full"
              >
                {bps % 100 === 0 ? `${bps / 100}%` : `${(bps / 100).toFixed(2)}%`}
              </Button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              id="slippage"
              inputMode="decimal"
              value={customSlippage}
              onChange={(event) => setCustomSlippage(event.target.value)}
              placeholder="Custom"
              className="h-11 flex-1 rounded-inputs border border-frost px-3 text-body outline-none placeholder:text-ash focus:border-vertex focus:ring-2 focus:ring-vertex/40"
            />
            <span className="text-body-sm text-slate">%</span>
            <Button
              onClick={() => {
                const parsed = Number(customSlippage)
                if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) return
                onSlippageChange(Math.round(parsed * 100))
              }}
              variant="outline"
            >
              Set
            </Button>
          </div>
        </div>

        <div>
          <label htmlFor="deadline" className="text-body font-w535 text-midnight-ink">
            Transaction deadline
          </label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {DEADLINE_PRESETS.map((minutes) => (
              <Button
                key={minutes}
                variant={deadlineMinutes === minutes ? 'soft' : 'outline'}
                onClick={() => {
                  onDeadlineChange(minutes)
                  setCustomDeadline('')
                }}
                className="w-full"
              >
                {minutes}m
              </Button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              id="deadline"
              inputMode="numeric"
              value={customDeadline}
              onChange={(event) => setCustomDeadline(event.target.value)}
              placeholder="Custom"
              className="h-11 flex-1 rounded-inputs border border-frost px-3 text-body outline-none placeholder:text-ash focus:border-vertex focus:ring-2 focus:ring-vertex/40"
            />
            <span className="text-body-sm text-slate">min</span>
            <Button
              variant="outline"
              onClick={() => {
                const parsed = Number(customDeadline)
                if (!Number.isFinite(parsed) || parsed <= 0) return
                onDeadlineChange(Math.round(parsed))
              }}
            >
              Set
            </Button>
          </div>
        </div>

        <p className={cn('rounded-panels bg-vertex-tint px-3 py-2.5 text-body-sm text-vertex-ink')}>
          Minimum received is enforced by the router as <span className="font-w535">amountOutMinimum</span>. If the
          pool moves against you beyond {((slippageBps || DEFAULT_DEADLINE_MINUTES) / 100).toFixed(2)}%, the trade
          reverts instead of filling worse.
        </p>

        <Button fullWidth size="lg" onClick={onClose}>
          Done
        </Button>
      </div>
    </Dialog>
  )
}