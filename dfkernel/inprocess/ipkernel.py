from ipykernel.inprocess.ipkernel import InProcessKernel
from dfkernel.ipkernel import IPythonKernel
from anyio import TASK_STATUS_IGNORED
from anyio.abc import TaskStatus
from traitlets import List, default, Instance
from ..iostream import OutStream


class InProcessKernel(IPythonKernel,InProcessKernel):

    frontends = List(Instance("dfkernel.inprocess.client.InProcessKernelClient", allow_none=True))

    # def __init__(self, **traits):
    #     super().__init__(**traits)
        #self._io_dispatch()
        #if self.shell:
        #    self.shell.kernel = self

    async def start(self, *, task_status: TaskStatus = TASK_STATUS_IGNORED) -> None:
        """Override registration of dispatchers for streams."""
        if self.shell:
            self.shell.exit_now = False
        await IPythonKernel.start(self,task_status=task_status)
    
    @default("stdout")
    def _default_stdout(self):
        return OutStream(self.session, self.iopub_thread, "stdout", watchfd=False)

    @default("stderr")
    def _default_stderr(self):
        return OutStream(self.session, self.iopub_thread, "stderr", watchfd=False)