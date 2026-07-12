'use client';

import { useFormStatus } from 'react-dom';
import { loginAdmin } from '@/app/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press w-full rounded-pill bg-primary px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
    >
      {pending ? '確認中…' : '入る'}
    </button>
  );
}

export function AdminLogin() {
  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-lg border border-hairline bg-canvas p-8">
        <h1 className="text-[24px] font-semibold tracking-tight-apple text-ink">運用ダッシュボード</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
          このページは関係者（管理者）向けです。パスフレーズを入力してください。
        </p>
        <form action={loginAdmin} className="mt-5 space-y-3">
          <input
            name="passphrase"
            type="password"
            autoComplete="off"
            placeholder="パスフレーズ"
            className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 text-[16px] text-ink outline-none focus:border-primary"
          />
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
