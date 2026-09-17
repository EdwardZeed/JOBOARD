import { getCurrentResume } from '@/lib/data';
import { ResumeTemplate } from '@/components/resume-template';
import { PrintButton } from '@/components/print-button';

export default async function ResumePreviewPage() {
  const resume = await getCurrentResume();

  if (!resume?.structured) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        还没有结构化简历数据（profile_resume.structured 是空的）。
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen py-8">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print flex justify-center mb-6">
        <PrintButton />
      </div>
      <ResumeTemplate resume={resume.structured} />
    </div>
  );
}
