import Link from 'next/link';
import Topbar from '@/components/ui/Topbar';
import { Card, CardTitle, Chip, Empty } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/icons';
import { CopyCode, InviteForm, JoinForm } from '@/components/mentor/InviteForms';
import { cancelInvite } from '@/actions/mentor';
import { requireUser } from '@/lib/session';
import { getMentorships, unreadCount, type MentorshipRow } from '@/lib/mentor';
import { longDate } from '@/lib/format';
import Locked from '@/components/billing/Locked';
import { getBilling } from '@/lib/payments';
import { has } from '@/lib/billing';
import { getI18n } from '@/lib/i18n/server';
import { fill, type Dict, type Locale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

function LinkRow({
  link,
  who,
  role,
  d,
  locale,
}: {
  link: MentorshipRow;
  who: string;
  role: string;
  d: Dict;
  locale: Locale;
}) {
  return (
    <Link
      href={`/mentor/${link.id}`}
      className="flex items-center gap-3 rounded-[12px] border border-line2 px-3.5 py-3 transition-colors hover:border-[#2A3240] hover:bg-card2/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-blue-soft text-bluel">
        <Icon name="user" size={16} />
      </span>
      <span className="min-w-0 grow">
        <span className="block truncate text-[13px] font-bold text-txt">{who}</span>
        <span className="block truncate text-[11.5px] text-txt3">
          {role} ·{' '}
          {link.acceptedAt ? fill(d.mentor.since, { date: longDate(link.acceptedAt, locale) }) : '—'}
        </span>
      </span>
      <span className="shrink-0 text-txt3">
        <Icon name="chev" size={15} />
      </span>
    </Link>
  );
}

export default async function MentorPage() {
  const user = await requireUser();
  const { locale, d } = await getI18n(user.locale);
  const billing = await getBilling(user);

  if (!has(billing.plan, 'mentor')) {
    return (
      <>
        <Topbar title={d.mentor.title} sub={d.mentor.lockedSub} />
        <Locked feature="mentor" what={d.mentor.lockedWhat} why={d.mentor.lockedWhy} />
      </>
    );
  }

  const [{ asMentor, asStudent, pending }, unread] = await Promise.all([
    getMentorships(user.id),
    unreadCount(user.id),
  ]);

  const total = asMentor.length + asStudent.length;

  return (
    <>
      <Topbar
        title={d.mentor.title}
        sub={
          total === 0
            ? d.mentor.subEmpty
            : fill(d.mentor.sub, { students: asMentor.length, mentors: asStudent.length }) +
              (unread ? fill(d.mentor.subUnread, { n: unread }) : '')
        }
      />

      <div className="flex grow flex-col gap-3.5 p-5 sm:p-[22px] sm:px-[26px] xl:flex-row">
        <div className="flex min-w-0 grow flex-col gap-3.5">
          {asMentor.length > 0 ? (
            <Card>
              <CardTitle right={<Chip tone="blue">{asMentor.length}</Chip>}>
                {d.mentor.myStudents}
              </CardTitle>
              <div className="flex flex-col gap-2">
                {asMentor.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    who={link.student?.name ?? d.mentor.student}
                    role={d.mentor.roleStudent}
                    d={d}
                    locale={locale}
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {asStudent.length > 0 ? (
            <Card>
              <CardTitle right={<Chip tone="blue">{asStudent.length}</Chip>}>
                {d.mentor.myMentors}
              </CardTitle>
              <div className="flex flex-col gap-2">
                {asStudent.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    who={link.mentor?.name ?? d.mentor.mentorWord}
                    role={d.mentor.roleMentor}
                    d={d}
                    locale={locale}
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {total === 0 ? (
            <Empty
              icon="user"
              title={d.mentor.emptyTitle}
              hint={d.mentor.emptyHint}
            />
          ) : null}

          {pending.length > 0 ? (
            <Card>
              <CardTitle>{d.mentor.pending}</CardTitle>
              <div className="flex flex-col gap-2">
                {pending.map((link) => (
                  <div
                    key={link.id}
                    className="flex flex-wrap items-center gap-2.5 rounded-[12px] border border-dashed border-line px-3.5 py-3"
                  >
                    <span className="tnum font-mono text-[15px] font-bold tracking-[0.1em] text-txt">
                      {link.inviteCode}
                    </span>
                    <Chip tone="neutral">
                      {link.inviterRole === 'MENTOR'
                        ? d.mentor.waitingStudent
                        : d.mentor.waitingMentor}
                    </Chip>
                    <span className="grow" />
                    <CopyCode code={link.inviteCode} />
                    <form action={cancelInvite}>
                      <input type="hidden" name="id" value={link.id} />
                      <button
                        type="submit"
                        className="inline-flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-line bg-card2 px-2.5 text-[11.5px] font-bold text-txt3 transition-colors hover:text-loss"
                      >
                        <Icon name="x" size={12} width={2.4} />
                        {d.common.cancel}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="flex w-full shrink-0 flex-col gap-3.5 xl:w-[330px]">
          <Card>
            <CardTitle>{d.mentor.createInvite}</CardTitle>
            <p className="mb-3 text-[12px] leading-relaxed text-txt3">{d.mentor.createInviteNote}</p>
            <InviteForm />
          </Card>

          <Card>
            <CardTitle>{d.mentor.joinTitle}</CardTitle>
            <JoinForm />
          </Card>

          <Card>
            <div className="flex items-start gap-2.5">
              <span className="mt-px shrink-0 text-txt3">
                <Icon name="lock" size={15} />
              </span>
              <div className="text-[11.5px] leading-relaxed text-txt3">
                <p className="mb-1.5 font-bold text-txt2">{d.mentor.privacyTitle}</p>
                <p>
                  {d.mentor.privacyBody1}{' '}
                  <span className="font-semibold text-txt2">{d.mentor.privacyBody2}</span>{' '}
                  {d.mentor.privacyBody3}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
