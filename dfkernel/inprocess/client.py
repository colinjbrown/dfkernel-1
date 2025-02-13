from ipykernel.inprocess.client import InProcessKernelClient
from traitlets import Instance

class InProcessKernelClient(InProcessKernelClient):
    kernel = Instance("dfkernel.inprocess.ipkernel.InProcessKernel",allow_none=True)