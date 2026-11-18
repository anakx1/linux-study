window.HLW.chapters.push({
  id: 5,
  title: 'How the Linux Kernel Boots',
  short: 'Kernel boot',
  track: 'storage',
  ref: 'Chapter 5',
  sectionsRef: '5.1–5.8',
  minutes: 40,
  tagline: 'From firmware to the first process.',
  blurb: 'Follow the boot path: firmware, boot loader, kernel decompression, hardware initialisation, the initramfs, and the handoff to user space.',
  objectives: [
    'Describe the sequence from power-on to the kernel starting init.',
    'Read boot messages and kernel parameters to diagnose startup problems.',
    'Explain what GRUB does and how to inspect or edit its configuration.',
    'Compare BIOS/MBR and UEFI boot, including Secure Boot implications.',
    'Understand why an initial RAM filesystem is needed and how to recover a broken boot.'
  ],
  sections: [
    {
      id: 'ch5-messages',
      ref: '5.1',
      title: 'Reading the boot story',
      html: `<p>Boot problems are easiest to solve when you know which stage failed. The kernel logs hardware detection, driver binding and subsystem initialisation to a ring buffer. At boot those messages are copied into the system journal, and on many systems also to the console.</p>
      <pre><code>$ dmesg | less
$ journalctl -k -b            # kernel messages from this boot
$ journalctl -b -p err        # errors and worse from this boot
$ journalctl --list-boots</code></pre>
      <p>Look for the first error, not the last. A missing driver often produces a cascade of follow-on failures: a disk is not found, so the root filesystem cannot mount, so init cannot start. <code>dmesg -T</code> adds human-readable timestamps; <code>dmesg -w</code> follows new messages.</p>
      <p>Firmware messages (BIOS/UEFI) usually appear before the kernel takes over and may not reach the journal. If the machine resets before any kernel output, suspect firmware settings, boot order, or a boot-loader problem rather than Linux itself.</p>`
    },
    {
      id: 'ch5-kernel',
      ref: '5.2–5.3',
      title: 'Kernel initialisation and parameters',
      html: `<p>The boot loader loads a compressed kernel image and an initial RAM filesystem (initramfs) into memory, then jumps into the kernel. The kernel decompresses itself, sets up memory management and interrupts, probes buses, and initialises built-in drivers. It then looks for the root filesystem specified on the command line and starts the first user-space program.</p>
      <p><strong>Kernel parameters</strong> are passed on the boot loader's kernel command line. They control early behaviour and can be essential for recovery.</p>
      <pre><code>root=UUID=...      which filesystem to mount as /
ro                 mount root read-only initially
rw                 mount root read-write
quiet              suppress most kernel messages
splash             show a graphical boot screen
init=/bin/sh       run a shell instead of init (recovery)
rd.break           stop in the initramfs (systemd/Dracut)
systemd.unit=rescue.target   boot a minimal target
nomodeset          disable kernel mode setting (graphics issues)</code></pre>
      <p>Inspect the current command line with <code>cat /proc/cmdline</code>. On a running system, persistent parameters live in the boot-loader configuration; on Debian/Ubuntu usually <code>/etc/default/grub</code>, then regenerate with <code>update-grub</code>. On RHEL-family systems the same file is used with <code>grub2-mkconfig</code>.</p>
      <div class="callout key"><span class="co-ico">★</span><div><div class="co-title">Kernel versus initramfs</div><p>The kernel image contains core drivers and code. The initramfs is a small temporary filesystem containing the modules and tools needed to find and mount the real root filesystem — often storage, encryption or network drivers.</p></div></div>`
    },
    {
      id: 'ch5-loaders',
      ref: '5.4',
      title: 'Boot loaders and their job',
      html: `<p>A boot loader is the bridge between firmware and kernel. Its tasks are modest but critical:</p>
      <ul>
        <li>Locate the kernel image and initramfs.</li>
        <li>Load them into memory.</li>
        <li>Pass the kernel command line.</li>
        <li>Transfer control to the kernel.</li>
      </ul>
      <p><strong>GRUB</strong> is the dominant boot loader on BIOS and UEFI x86 systems. It understands many filesystems, can read its configuration from disk, presents a menu, and offers an interactive command line for rescue. <strong>systemd-boot</strong> is a simpler UEFI-only loader that reads entries from the EFI system partition. <strong>extlinux</strong> (SYSLINUX) and <strong>U-Boot</strong> are common on embedded and ARM systems.</p>
      <p>Boot loaders can chainload one another or other operating systems. A common layout is firmware → GRUB → Linux kernel. On multi-boot machines, GRUB may present Linux and Windows entries; Windows Boot Manager can also be selected from the firmware menu.</p>
      <p>Boot entries are not the same as init systems. The loader's only job is to start the kernel; everything after that — mounting filesystems, starting services, logging in — belongs to the kernel and user space (Chapter 6).</p>`
    },
    {
      id: 'ch5-grub',
      ref: '5.5',
      title: 'GRUB: command line, configuration and installation',
      html: `<p>If the menu fails, GRUB's interactive shell can rescue the system. You can identify partitions, load a kernel manually, and boot. Device names use GRUB's own syntax: <code>(hd0,gpt2)</code> means the first disk, second GPT partition.</p>
      <pre><code>grub&gt; ls
grub&gt; ls (hd0,gpt2)/
grub&gt; set root=(hd0,gpt2)
grub&gt; linux /boot/vmlinuz-6.8.0 root=UUID=xxxx ro
grub&gt; initrd /boot/initrd.img-6.8.0
grub&gt; boot</code></pre>
      <p>Persistent configuration is generated, not usually edited by hand. On Debian/Ubuntu:</p>
      <pre><code>$ sudoedit /etc/default/grub
$ sudo update-grub</code></pre>
      <p>On RHEL/Fedora:</p>
      <pre><code>$ sudoedit /etc/default/grub
$ sudo grub2-mkconfig -o /boot/grub2/grub.cfg</code></pre>
      <p>On UEFI systems the config may be at <code>/boot/efi/EFI/&lt;distro&gt;/grub.cfg</code>. The generated file should not be edited directly; your changes will be overwritten. <code>grub-install</code> writes the boot loader to disk or the EFI system partition. Running it against the wrong device can make a machine unbootable, so confirm the target twice.</p>
      <p>Useful kernel entries can be added with <code>GRUB_CMDLINE_LINUX_DEFAULT</code> (normal boot) or <code>GRUB_CMDLINE_LINUX</code> (all entries). Keep a known-good kernel installed; distributions usually retain several under <code>/boot</code>.</p>`
    },
    {
      id: 'ch5-uefi',
      ref: '5.6–5.7',
      title: 'UEFI, Secure Boot and chainloading',
      html: `<p><strong>UEFI</strong> replaces the legacy BIOS interface. Firmware reads boot entries stored in NVRAM, each pointing to an EFI executable on the EFI system partition (ESP) — a FAT32 filesystem usually mounted at <code>/boot/efi</code>. The ESP holds loaders such as <code>EFI/ubuntu/grubx64.efi</code> or <code>EFI/systemd/systemd-bootx64.efi</code>.</p>
      <pre><code>$ efibootmgr -v
$ bootctl status
$ ls /boot/efi/EFI/
$ sudo efibootmgr --bootorder 0001,0002</code></pre>
      <p><strong>Secure Boot</strong> requires boot components to carry a valid signature from a trusted key. Linux distributions ship a signed <strong>shim</strong> that then loads GRUB and the kernel. Third-party kernel modules (including some NVIDIA and VirtualBox drivers) may need to be signed with a Machine Owner Key (MOK) enrolled through the firmware's key-management flow.</p>
      <p>Secure Boot is a chain of trust, not a Linux feature. Disabling it weakens that chain; enrolling your own key preserves it while allowing custom components. On servers, also consider measured boot and TPM-based attestation.</p>
      <p><strong>Chainloading</strong> means one boot loader starts another. GRUB can boot Windows with <code>chainloader</code>, and firmware can boot a removable loader. This is how multi-boot and rescue USB drives work.</p>`
    },
    {
      id: 'ch5-details',
      ref: '5.8',
      title: 'MBR and UEFI boot in detail',
      html: `<p><strong>BIOS/MBR boot</strong> begins with firmware reading the first 512-byte sector. The MBR contains a tiny first-stage loader (446 bytes) plus a partition table. GRUB's first stage locates and loads <code>core.img</code> from the gap after the MBR or from a partition, which then reads the full GRUB modules and configuration. This multi-stage design exists because 446 bytes cannot hold a filesystem driver.</p>
      <p><strong>UEFI boot</strong> has no MBR code. Firmware understands FAT and launches an EFI application directly. That application (shim → GRUB, or systemd-boot) reads configuration and loads the kernel. GPT is the normal partition scheme.</p>
      <p>Once the kernel runs, the path converges: initialise hardware, mount initramfs, load needed modules, find the root filesystem, mount it, and execute <code>/sbin/init</code> (usually a symlink to systemd). If any of those steps fail, the kernel panics or drops to an emergency shell.</p>
      <pre><code>$ file /boot/vmlinuz-*
$ lsinitramfs /boot/initrd.img-* | head
$ cat /proc/cmdline
$ systemctl --version</code></pre>`,
      diagram: {
        type: 'flow',
        caption: 'Two firmware paths, one kernel destination',
        items: [
          { t: 'Firmware', d: 'BIOS or UEFI' },
          { t: 'Boot loader', d: 'GRUB / systemd-boot' },
          { t: 'Kernel + initramfs', d: 'decompress, probe, mount root' },
          { t: 'init', d: 'PID 1 starts user space' }
        ]
      }
    }
  ],
  commands: [
    { cmd: 'dmesg -T | less', desc: 'Read kernel messages with human-readable timestamps.' },
    { cmd: 'journalctl -k -b', desc: 'Show kernel messages from the current boot.' },
    { cmd: 'journalctl -b -p err', desc: 'Show errors and worse from the current boot.' },
    { cmd: 'cat /proc/cmdline', desc: 'Print the kernel command line used for this boot.' },
    { cmd: 'uname -r', desc: 'Show the running kernel release.' },
    { cmd: 'ls -lh /boot', desc: 'List kernels, initramfs images and boot-loader configuration.' },
    { cmd: 'sudo update-grub', desc: 'Regenerate GRUB configuration on Debian/Ubuntu.' },
    { cmd: 'sudo grub2-mkconfig -o /boot/grub2/grub.cfg', desc: 'Regenerate GRUB configuration on RHEL-family systems.' },
    { cmd: 'efibootmgr -v', desc: 'List UEFI boot entries and the devices they reference.' },
    { cmd: 'bootctl status', desc: 'Show systemd-boot and UEFI firmware status (systemd systems).' },
    { cmd: 'lsinitramfs /boot/initrd.img-$(uname -r)', desc: 'List the contents of the current initramfs.' }
  ],
  labs: [
    {
      title: 'Inspect this boot',
      goal: 'Reconstruct what happened from the running system.',
      steps: [
        'Run <code>cat /proc/cmdline</code> and identify the root device, read-only flag and any quiet/splash options.',
        'Run <code>journalctl -k -b | head -60</code>. Find the kernel version, command line and first detected storage device.',
        'Run <code>uname -r</code> and confirm the matching <code>vmlinuz</code> and <code>initrd</code> files exist in <code>/boot</code>.',
        'If UEFI, run <code>efibootmgr -v</code> or <code>bootctl status</code>; identify the current boot entry.',
        'Explain which component would fail if the initramfs lacked the driver for your root disk.'
      ]
    },
    {
      title: 'Plan a recovery boot',
      goal: 'Practise the decisions, without changing the machine.',
      steps: [
        'Write down the GRUB commands you would use to boot your root partition manually: <code>ls</code>, <code>set root=</code>, <code>linux</code>, <code>initrd</code>, <code>boot</code>.',
        'Find the UUID of your root filesystem with <code>blkid</code> or <code>findmnt</code>.',
        'Identify the kernel parameter that gives you a shell instead of init, and one that stops in the initramfs.',
        'Find the key you press to edit a GRUB menu entry (usually <code>e</code>) and the key to boot the edited entry (usually Ctrl-X or F10).',
        'Check whether Secure Boot is enabled (<code>bootctl status</code> or firmware settings) and note what that implies for unsigned modules.'
      ]
    }
  ],
  cards: [
    { front: 'What are the kernel\u2019s first jobs after being loaded?', back: 'Decompress itself, initialise memory and interrupts, probe hardware, mount the initramfs, load drivers, mount the real root filesystem, then start init.' },
    { front: 'What is an initramfs?', back: 'A small temporary RAM filesystem containing the modules and tools needed to find and mount the real root filesystem.' },
    { front: 'What does root= on the kernel command line do?', back: 'Tells the kernel which block device or UUID to mount as the root filesystem.' },
    { front: 'BIOS/MBR vs UEFI boot', back: 'BIOS reads the MBR code and chainloads a boot loader. UEFI reads NVRAM boot entries and launches an EFI executable from the FAT32 ESP.' },
    { front: 'What is Secure Boot?', back: 'Firmware verifies signatures of boot components before executing them. Linux uses a signed shim; custom modules may need MOK enrollment.' },
    { front: 'How do you add a persistent kernel parameter?', back: 'Edit /etc/default/grub (GRUB_CMDLINE_LINUX_DEFAULT or GRUB_CMDLINE_LINUX), then regenerate grub.cfg with update-grub or grub2-mkconfig.' }
  ],
  quiz: [
    {
      q: 'Which component mounts the real root filesystem?',
      options: ['The firmware', 'The boot loader', 'The kernel, often with help from the initramfs', 'systemd-logind'],
      answer: 2,
      explain: 'The kernel mounts the root filesystem. The initramfs supplies the drivers and tools needed to locate it, especially for encrypted, LVM or network-backed roots.'
    },
    {
      q: 'Where does UEFI firmware look for boot loaders?',
      options: ['The first sector of the disk', 'EFI executables on the EFI system partition, referenced by NVRAM entries', 'The /boot directory on ext4', 'The MBR gap'],
      answer: 1,
      explain: 'UEFI reads boot entries from NVRAM and loads EFI applications from the FAT32 ESP. MBR boot code is a BIOS concept.'
    },
    {
      q: 'What is the usual effect of the <code>ro</code> kernel parameter?',
      options: [
        'The root filesystem is mounted read-only initially.',
        'All disks become read-only.',
        'The system cannot boot.',
        'Secure Boot is disabled.'
      ],
      answer: 0,
      explain: 'ro tells the kernel to mount root read-only at first. Init scripts run fsck and then remount it read-write, or systemd does so as part of the boot transaction.'
    },
    {
      q: 'A machine shows no kernel messages at all after power-on. Where should you look first?',
      options: ['/var/log/syslog', 'journalctl', 'Firmware settings and boot order', 'The user\u2019s shell startup files'],
      answer: 2,
      explain: 'If no kernel output appears, Linux has not started. Check firmware boot order, boot media, and whether the boot loader is present before debugging the kernel.'
    },
    {
      q: 'What does <code>init=/bin/sh</code> do?',
      options: [
        'Starts a shell as PID 1 instead of the normal init.',
        'Runs a shell after login.',
        'Reinstalls init.',
        'Mounts /bin as a filesystem.'
      ],
      answer: 0,
      explain: 'It replaces the init program with a shell, giving emergency access. The root filesystem may be read-only and most services will not be running.'
    }
  ]
});
