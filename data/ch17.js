window.HLW.chapters.push({
  id: 17,
  title: 'Virtualization',
  short: 'Virtualization',
  track: 'desktop',
  ref: 'Chapter 17',
  sectionsRef: '17.1–17.3',
  minutes: 40,
  tagline: 'Many machines, one kernel — or many kernels, one host.',
  blurb: 'Compare virtual machines and containers: hypervisors, hardware virtualization, namespaces, cgroups, Docker/Podman workflows, LXC and the security boundaries that matter.',
  objectives: [
    'Explain how a hypervisor runs virtual machines and the difference between type 1 and type 2.',
    'Describe hardware virtualization support and common VM use cases and costs.',
    'Explain how containers use namespaces and cgroups while sharing the host kernel.',
    'Build and run a simple container image with Docker or Podman.',
    'Choose between VMs and containers based on isolation, compatibility and operations.'
  ],
  sections: [
    {
      id: 'ch17-vms',
      ref: '17.1.1–17.1.2',
      title: 'Virtual machines and hypervisors',
      html: `<p>A <strong>virtual machine</strong> (VM) is a complete computer emulated or virtualised by software: its own virtual CPU, memory, disks, network cards and firmware. A <strong>hypervisor</strong> creates and runs VMs. The guest OS believes it is on real hardware and runs an unmodified kernel.</p>
      <ul>
        <li><strong>Type 1</strong> hypervisors run directly on hardware: Xen, VMware ESXi, Microsoft Hyper-V. KVM is a Linux kernel module that turns the host kernel into a type 1-style hypervisor.</li>
        <li><strong>Type 2</strong> hypervisors run as applications on a host OS: VirtualBox, VMware Workstation, QEMU with TCG. They are convenient for desktops but add overhead.</li>
      </ul>
      <pre><code>$ egrep -c '(vmx|svm)' /proc/cpuinfo    # hardware virt support
$ ls -l /dev/kvm
$ kvm-ok                                 # Debian/Ubuntu helper
$ qemu-system-x86_64 -enable-kvm -m 2G -cdrom image.iso</code></pre>
      <p>Hardware-assisted virtualization (Intel VT-x, AMD-V) lets the guest execute privileged instructions directly under controlled conditions. Without it, QEMU must emulate every instruction in software, which is dramatically slower. Nested virtualization — running KVM inside a VM — requires explicit support from the host and guest configuration.</p>
      <p>The hypervisor provides virtual devices. Virtio drivers are paravirtualized devices that cooperate with the guest for much better I/O performance than emulated hardware. Most Linux guests should use virtio disk, network and balloon drivers.</p>`
    },
    {
      id: 'ch17-vm-uses',
      ref: '17.1.3–17.1.4',
      title: 'VM uses and drawbacks',
      html: `<p>VMs excel at isolation and compatibility. Each guest has its own kernel, so you can run Windows, BSD or an older Linux on the same hardware. A compromised guest is contained by the hypervisor boundary, assuming the hypervisor and hardware are not themselves compromised.</p>
      <ul>
        <li><strong>Server consolidation:</strong> many workloads on one physical machine.</li>
        <li><strong>Testing and development:</strong> disposable snapshots, different OS versions.</li>
        <li><strong>Legacy software:</strong> keep an old environment running safely.</li>
        <li><strong>Untrusted workloads:</strong> stronger isolation than a typical container.</li>
        <li><strong>Live migration:</strong> move a running VM between hosts with shared storage.</li>
      </ul>
      <p>The costs are real: each VM runs a full kernel and user space, consuming memory and CPU; boot times are measured in seconds to minutes; images are large; and the hypervisor adds a layer to debug. Nested I/O can be complex, and GPU passthrough requires hardware and firmware support.</p>
      <p>Backups must capture the whole disk image and configuration, ideally with snapshots and quiescing. A VM snapshot is not a backup if it lives on the same failed disk.</p>`
    },
    {
      id: 'ch17-containers',
      ref: '17.2–17.2.1',
      title: 'Containers: namespaces, cgroups and images',
      html: `<p>A <strong>container</strong> is a process (or group of processes) isolated with Linux <strong>namespaces</strong> and constrained by <strong>cgroups</strong>. It shares the host kernel. There is no guest kernel to boot, so containers start almost instantly and pack densely.</p>
      <ul>
        <li><strong>Namespaces</strong> isolate what a process can see: PID, mount, network, UTS (hostname), IPC, user IDs, cgroups and time.</li>
        <li><strong>cgroups</strong> limit and account for CPU, memory, I/O, PIDs and more (Chapter 8).</li>
        <li><strong>Capabilities, seccomp and LSMs</strong> (SELinux/AppArmor) restrict what the process can do even inside its namespace.</li>
        <li><strong>Images</strong> are layered filesystem snapshots plus metadata; a container is a running instance of an image.</li>
      </ul>
      <pre><code>$ unshare --pid --fork --mount-proc bash
$ ls -l /proc/self/ns/
$ docker ps
$ podman ps
$ docker run --rm -it alpine sh</code></pre>
      <p><strong>Docker</strong> popularised the image/registry workflow and runs containers through a daemon (dockerd) as root by default. <strong>Podman</strong> is daemonless and supports rootless containers. Both use OCI image formats. Rootless containers map the container's root to an unprivileged host UID, which reduces the damage a breakout can do.</p>
      <div class="callout warn"><span class="co-ico">!</span><div><div class="co-title">Containers are not a security boundary by default</div><p>A container shares the host kernel. Running untrusted code in a container without user namespaces, seccomp, LSMs and minimal capabilities is risky. <code>--privileged</code> and mounting the Docker socket effectively grant host root.</p></div></div>`
    },
    {
      id: 'ch17-docker',
      ref: '17.2.2',
      title: 'A Docker example',
      html: `<p>A <code>Dockerfile</code> describes an image build. Each instruction creates a layer; layers are cached and reused. Keep images small, pin base versions, run as a non-root user, and do not bake secrets into layers.</p>
      <pre><code>FROM debian:stable-slim
RUN apt-get update &amp;&amp; apt-get install -y --no-install-recommends nginx \\
    &amp;&amp; rm -rf /var/lib/apt/lists/*
COPY site/ /var/www/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]</code></pre>
      <pre><code>$ docker build -t mysite:1.0 .
$ docker run -d --name site -p 8080:80 mysite:1.0
$ docker ps
$ docker logs -f site
$ docker exec -it site sh
$ docker stop site &amp;&amp; docker rm site</code></pre>
      <p><code>-p 8080:80</code> publishes container port 80 on host port 8080. Volumes persist data outside the container's writable layer: <code>-v /srv/site:/var/www/html</code>. Networks connect containers; by default they can reach each other by name on a user-defined network.</p>
      <p>Commands map closely between Docker and Podman (<code>podman build</code>, <code>podman run</code>). Podman can also generate systemd units for containers, which is useful for running them as services. For multi-container applications, compose files describe services, networks and volumes.</p>
      <p>Image hygiene: use minimal base images, scan for vulnerabilities, sign and verify images, and rebuild regularly to pick up patches. A container image is a supply-chain artifact; treat it with the same care as a binary package.</p>`
    },
    {
      id: 'ch17-lxc',
      ref: '17.2.3, 17.3',
      title: 'LXC, system containers and choosing a model',
      html: `<p><strong>LXC</strong> and <strong>systemd-nspawn</strong> run <em>system containers</em>: a full user space with init, several services and a long-lived filesystem, sharing the host kernel. They feel like lightweight VMs and are useful for isolating services on a small host without a full hypervisor.</p>
      <pre><code>$ lxc list
$ lxc launch ubuntu:24.04 web
$ lxc exec web -- bash
$ sudo systemd-nspawn -D /var/lib/machines/web
$ machinectl list</code></pre>
      <p>Application containers (Docker/Podman) usually run one process and are built from images. System containers are configured more like machines. The line is blurry: both rely on the same kernel primitives, and both can be managed by systemd or orchestration tools.</p>
      <p>Choose a <strong>VM</strong> when you need a different kernel, strong isolation, live migration, hardware passthrough, or a legacy OS. Choose a <strong>container</strong> when you need fast startup, dense packing, immutable deployment and a shared Linux kernel is acceptable. Many production systems combine both: containers inside VMs, with the VM providing the tenant boundary.</p>
      <p>Whichever you choose, the operational questions are the same: how are images built and patched, where does data live, how is the network segmented, how are secrets delivered, and how do you observe what is running? Virtualization changes the packaging, not the fundamentals.</p>`
    }
  ],
  commands: [
    { cmd: 'egrep -c "(vmx|svm)" /proc/cpuinfo', desc: 'Check whether the CPU advertises hardware virtualization support.' },
    { cmd: 'ls -l /dev/kvm', desc: 'Confirm the KVM device is present and accessible.' },
    { cmd: 'qemu-system-x86_64 -enable-kvm -m 2G -cdrom image.iso', desc: 'Boot a VM with KVM acceleration and 2 GiB RAM.' },
    { cmd: 'virsh list --all', desc: 'List libvirt virtual machines and their states.' },
    { cmd: 'docker run --rm -it alpine sh', desc: 'Run an interactive disposable Alpine container.' },
    { cmd: 'docker build -t mysite:1.0 .', desc: 'Build an image from the Dockerfile in the current directory.' },
    { cmd: 'docker run -d -p 8080:80 --name site mysite:1.0', desc: 'Run a detached container publishing host port 8080 to container port 80.' },
    { cmd: 'docker ps', desc: 'List running containers.' },
    { cmd: 'docker logs -f site', desc: 'Follow a container\u2019s stdout/stderr logs.' },
    { cmd: 'docker exec -it site sh', desc: 'Open a shell inside a running container.' },
    { cmd: 'podman run --rm -it alpine sh', desc: 'Run a rootless, daemonless container with Podman.' },
    { cmd: 'unshare --pid --fork --mount-proc bash', desc: 'Create a new PID and mount namespace with a fresh /proc.' },
    { cmd: 'nsenter -t PID -n', desc: 'Enter the network namespace of an existing process.' },
    { cmd: 'lxc list', desc: 'List LXC system containers.' },
    { cmd: 'systemd-nspawn -D /var/lib/machines/web', desc: 'Boot a directory as a systemd-nspawn container.' }
  ],
  labs: [
    {
      title: 'Check virtualization capability',
      goal: 'Determine what your machine can run without changing it.',
      steps: [
        'Run <code>egrep -c "(vmx|svm)" /proc/cpuinfo</code>. A non-zero count indicates CPU virtualization support.',
        'Run <code>ls -l /dev/kvm</code>. Is the device present and accessible to your user?',
        'Check whether you are already inside a VM: <code>systemd-detect-virt</code> or <code>cat /sys/class/dmi/id/product_name</code>.',
        'If KVM is available, run a tiny VM with <code>qemu-system-x86_64 -enable-kvm -m 512 -nographic</code> only if you have an image; otherwise stop at capability checks.',
        'Write down whether you would choose a VM or container for a Windows test environment and why.'
      ]
    },
    {
      title: 'Run and inspect a container',
      goal: 'See namespaces, cgroups and image layers in practice.',
      steps: [
        'If Docker or Podman is installed, run <code>docker run --rm -it alpine sh</code> (or the podman equivalent).',
        'Inside the container, run <code>ps aux</code>, <code>ip addr</code> and <code>cat /etc/os-release</code>. Compare with the host.',
        'From the host, run <code>docker ps</code> and inspect the container with <code>docker inspect NAME</code>. Find its PID and cgroup path.',
        'Run <code>unshare --pid --fork --mount-proc bash</code> and observe that <code>ps</code> shows a new PID namespace.',
        'Exit and verify the host processes are unaffected.'
      ]
    }
  ],
  cards: [
    { front: 'What is a hypervisor?', back: 'Software that creates and runs virtual machines, providing virtual hardware and isolating guests from the host and each other.' },
    { front: 'Type 1 vs type 2 hypervisor', back: 'Type 1 runs directly on hardware (Xen, ESXi, KVM in the kernel). Type 2 runs as an application on a host OS (VirtualBox, VMware Workstation).' },
    { front: 'What does KVM need from the CPU?', back: 'Hardware virtualization extensions (Intel VT-x or AMD-V), exposed by firmware; /dev/kvm is the interface.' },
    { front: 'What are Linux namespaces?', back: 'Kernel isolation for PID, mount, network, UTS, IPC, user, cgroup and time views. They make a process think it has its own system.' },
    { front: 'What is the key difference between a VM and a container?', back: 'A VM runs its own kernel under a hypervisor. A container shares the host kernel and is isolated by namespaces, cgroups and security policy.' },
    { front: 'Why is --privileged dangerous?', back: 'It removes most container restrictions, giving the container broad access to host devices and kernel capabilities — effectively host root in many cases.' },
    { front: 'What is a container image?', back: 'A layered, immutable filesystem plus metadata used to create containers. Layers are cached and shared via registries.' }
  ],
  quiz: [
    {
      q: 'What does a container share with its host?',
      options: ['Its kernel', 'Its BIOS', 'Its physical disk controller', 'Its boot loader'],
      answer: 0,
      explain: 'Containers share the host kernel and isolate processes with namespaces and cgroups. That is why they start fast and why kernel security matters.'
    },
    {
      q: 'Which mechanism limits a container\u2019s memory and CPU?',
      options: ['Namespaces', 'cgroups', 'The boot loader', 'SELinux alone'],
      answer: 1,
      explain: 'cgroups account for and constrain resources. Namespaces control visibility, while LSMs and capabilities restrict privileges.'
    },
    {
      q: 'What does <code>docker run -p 8080:80</code> do?',
      options: [
        'Copies port 80 to 8080 inside the container',
        'Publishes container port 80 on host port 8080',
        'Creates a volume',
        'Exposes the Docker daemon'
      ],
      answer: 1,
      explain: 'The syntax is host:container. Traffic to host port 8080 is forwarded to port 80 in the container.'
    },
    {
      q: 'When is a VM a better choice than a container?',
      options: [
        'You need the smallest possible startup time',
        'You need to run a different kernel or an untrusted workload with stronger isolation',
        'You want to share the host kernel',
        'You are packaging a single stateless service'
      ],
      answer: 1,
      explain: 'VMs provide their own kernel and a hypervisor boundary, which matters for different OSes and stronger tenant isolation.'
    },
    {
      q: 'Why is mounting /var/run/docker.sock into a container risky?',
      options: [
        'It uses too much disk.',
        'It gives the container control of the Docker daemon, which is effectively host root.',
        'It disables networking.',
        'It prevents image pulls.'
      ],
      answer: 1,
      explain: 'The Docker socket is a privileged API. A process that can use it can start privileged containers and escape to the host.'
    }
  ]
});
