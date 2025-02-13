from ipykernel.inprocess.manager import InProcessKernelManager
from anyio import TASK_STATUS_IGNORED
from anyio.abc import TaskStatus
from typing import Any
from traitlets import Instance

class InProcessKernelManager(InProcessKernelManager):

    kernel = Instance("dfkernel.inprocess.ipkernel.InProcessKernel",allow_none=True)
    #client_class = DottedObjectName("dfkernel.inprocess.")

    async def start_kernel(# type: ignore[explicit-override, override]
        self, *, task_status: TaskStatus = TASK_STATUS_IGNORED, **kwds: Any
) -> None:
        """Start the kernel."""
        from dfkernel.inprocess.ipkernel import InProcessKernel
        self.kernel = InProcessKernel(parent=self, session=self.session)
        await self.kernel.start(task_status=task_status)