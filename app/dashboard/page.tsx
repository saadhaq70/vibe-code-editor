import { deleteProjectById, duplicateProjectById, editProjectById, getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import AddNewButton from "@/modules/dashboard/components/add-new";
import AddRepo from "@/modules/dashboard/components/add-repo";
import EmptyState from "@/modules/dashboard/components/empty-state";
import ProjectTable from "@/modules/dashboard/components/project-table";
import React from "react";

const Page = async () => {
  const playgrounds = await getAllPlaygroundForUser();
  console.log("Playgrounds:", playgrounds);
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full min-w-0 max-w-7xl flex-col items-center justify-start px-4 py-6 sm:py-10">
      <div className="grid w-full min-w-0 grid-cols-1 gap-6 min-[1280px]:grid-cols-2">
        <AddNewButton />
        <AddRepo />
      </div>

      <div className="mt-8 flex w-full min-w-0 flex-col items-center justify-center sm:mt-10">
        {playgrounds && playgrounds.length === 0 ? (
          <EmptyState />
        ) : (
          <ProjectTable
            projects={playgrounds || []}
            onDeleteProject={deleteProjectById}
            onUpdateProject={editProjectById}
            onDuplicateProject={duplicateProjectById}
          />
        )}
      </div>
    </div>
  );
};

export default Page;
