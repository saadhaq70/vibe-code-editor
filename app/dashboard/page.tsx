import { deleteProjectById, duplicateProjectById, editProjectById, getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import AddNewButton from "@/modules/dashboard/components/add-new";
import AddRepo from "@/modules/dashboard/components/add-repo";
import EmptyState from "@/modules/dashboard/components/empty-state";
import ProjectTable from "@/modules/dashboard/components/project-table";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import React from "react";

const Page = async () => {
  const playgrounds = await getAllPlaygroundForUser();
  console.log("Playgrounds:", playgrounds);
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>
      <div className="flex-1 flex flex-col justify-start items-center mx-auto max-w-7xl px-4 py-10 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <AddNewButton />
          <AddRepo />
        </div>

        <div className="mt-10 flex flex-col justify-center items-center w-full">
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
    </>
  );
};

export default Page;
