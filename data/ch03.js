window.HLW.chapters.push({
  id: 3,
  title: 'Devices',
  short: 'Devices',
  track: 'storage',
  ref: 'Chapter 3',
  sectionsRef: '3.1–3.6',
  minutes: 35,
  tagline: 'Everything is a file — including the hardware.',
  blurb: 'How Linux represents disks, terminals and other hardware as device files, how sysfs exposes the device tree, and how udev creates stable names.',
  objectives: [
    'Explain block and character device files, major/minor numbers, and /dev.',
    'Use sysfs to trace a device to its driver and hardware bus.',
    'Understand what dd does and why it is dangerous without careful arguments.',
    'Decode common Linux device names for disks, terminals, audio and virtual devices.',
    'Explain how udev and devtmpfs populate /dev dynamically.'
  ],
  sections: [
    {
      id: 'ch3-devfiles',
      ref: '3.1',
      title: 'Device files and numbers',
      html: `<p>Linux exposes hardware through <strong>device files</strong> in <code>/dev</code>. A program opens, reads and writes a device much as it would a regular file; the kernel routes the operations to the right driver. There are two main kinds:</p>
      <ul>
        <li><strong>Block devices</strong> transfer data in fixed-size blocks and support random access. Disks and partitions are block devices.</li>
        <li><strong>Character devices</strong> transfer byte streams. Terminals, serial ports, audio devices and <code>/dev/null</code> are character devices.</li>
      </ul>
      <p>Each device file carries a <strong>major number</strong> (which driver handles it) and a <strong>minor number</strong> (which particular device or unit). <code>ls -l</code> shows them where a regular file would show its size:</p>
      <pre><code>$ ls -l /dev/sda /dev/tty /dev/null
brw-rw---- 1 root disk 8, 0 ... /dev/sda
crw-rw-rw- 1 root tty  5, 0 ... /dev/tty
crw-rw-rw- 1 root root 1, 3 ... /dev/null</code></pre>
      <p>The leading <code>b</code> or <code>c</code> identifies block or character. The <code>8, 0</code> is major 8, minor 0. The kernel's device registry is visible in <code>/proc/devices</code>. You can create a device node manually with <code>mknod</code>, but on a modern system udev normally does it for you.</p>
      <div class="callout warn"><span class="co-ico">!</span><div><div class="co-title">Device nodes are powerful</div><p>Writing directly to a block device bypasses the filesystem. A single wrong <code>of=</code> can destroy a disk. Verify every device path twice before running raw I/O.</p></div></div>`
    },
    {
      id: 'ch3-sysfs',
      ref: '3.2',
      title: 'sysfs: the kernel\u2019s device tree',
      html: `<p><code>/sys</code> is a virtual filesystem backed by kernel data structures. It presents devices, buses, drivers, modules and power information as directories and text files. Reading these files queries the kernel; writing some of them changes device behaviour.</p>
      <pre><code>/sys/
├── block/        block devices and their partitions
├── bus/          buses such as pci, usb, scsi
├── class/        device classes: net, tty, block, sound
├── devices/      the physical device tree
├── firmware/     firmware loading interfaces
├── fs/           filesystem parameters
├── module/       loaded kernel modules
└── power/        power-management controls</code></pre>
      <p>A useful exercise is to follow symlinks. <code>/sys/class/block/sda</code> points into the device tree under <code>/sys/devices/...</code>, where you can find the driver, the PCI or USB parent, and attributes such as size and removable status.</p>
      <pre><code>$ readlink -f /sys/class/block/sda
$ cat /sys/class/block/sda/size
$ ls /sys/block/sda/queue/
$ cat /sys/block/sda/device/model</code></pre>
      <p><code>/sys</code> is not a place to store data. It is a live view of kernel objects, regenerated at boot and changed by hotplug events.</p>`
    },
    {
      id: 'ch3-dd',
      ref: '3.3',
      title: 'dd: raw copies and conversions',
      html: `<p><code>dd</code> copies data in fixed-size blocks, optionally converting it. It is the Swiss-army knife for raw device work: imaging a disk, wiping a header, reading a partition table, or generating test files. It is also famously unforgiving.</p>
      <pre><code>dd if=input of=output bs=BLOCK_SIZE count=N [options]

$ dd if=/dev/zero of=test.img bs=1M count=100
$ dd if=/dev/sda of=mbr.img bs=512 count=1
$ dd if=backup.img of=/dev/sdb bs=4M status=progress
$ dd if=/dev/urandom of=key.bin bs=32 count=1</code></pre>
      <p><strong>if</strong> is the input, <strong>of</strong> the output, <strong>bs</strong> the block size, <strong>count</strong> the number of blocks, and <strong>status=progress</strong> prints throughput. <code>conv=fsync</code> flushes writes before dd exits; <code>conv=noerror,sync</code> keeps going after read errors, padding failed blocks.</p>
      <p>Without <code>of=</code>, dd writes to stdout. Without <code>if=</code>, it reads stdin. Both are useful for pipelines, but also make it easy to write binary data into your terminal by accident.</p>
      <div class="callout key"><span class="co-ico">★</span><div><div class="co-title">dd is not a filesystem tool</div><p>dd copies raw blocks. It does not understand files, partitions or free space. To copy files, use cp, rsync or tar; to copy a whole disk for backup, dd works but is slow and includes unused space.</p></div></div>`
    },
    {
      id: 'ch3-names',
      ref: '3.4',
      title: 'Decoding device names',
      html: `<p>Linux device names follow driver conventions. The names are not guaranteed to be stable across reboots when hardware changes; use UUIDs or labels in configuration files (Chapter 4).</p>
      <ul>
        <li><code>/dev/sda</code>, <code>/dev/sdb</code> — SCSI/SATA/USB disks handled by the sd driver. Partitions add a number: <code>sda1</code>, <code>sda2</code>.</li>
        <li><code>/dev/vda</code>, <code>/dev/xvda</code> — virtio and Xen virtual disks. Partitions: <code>vda1</code>.</li>
        <li><code>/dev/nvme0n1</code> — NVMe namespace 1; partitions use <code>p</code>: <code>nvme0n1p1</code>.</li>
        <li><code>/dev/dm-0</code>, <code>/dev/mapper/name</code> — device-mapper devices used by LVM, LUKS and software RAID.</li>
        <li><code>/dev/sr0</code> — optical drive. <code>/dev/hda</code> — legacy PATA disks.</li>
        <li><code>/dev/tty</code>, <code>/dev/tty0</code>, <code>/dev/pts/3</code> — controlling terminal, virtual console, pseudo-terminal.</li>
        <li><code>/dev/ttyS0</code> — serial port; <code>/dev/ttyUSB0</code>, <code>/dev/ttyACM0</code> — USB serial adapters.</li>
        <li><code>/dev/lp0</code> — parallel printer; <code>/dev/snd/*</code> — ALSA audio devices.</li>
      </ul>
      <p>The <strong>major/minor</strong> pair is what the kernel uses. The name is a convenience maintained by udev. That is why a disk can appear as <code>/dev/sdb</code> on one boot and <code>/dev/sdc</code> on the next.</p>`,
      diagram: {
        type: 'stack',
        caption: 'From hardware to a name you can open',
        items: [
          { t: 'Physical device', d: 'NVMe SSD / USB stick / SATA disk' },
          { t: 'Kernel driver', d: 'nvme, usb-storage, sd' },
          { t: 'Device number', d: 'major 259, minor 0' },
          { t: 'udev rule', d: 'creates /dev/nvme0n1 + symlinks', cls: 'hot' },
          { t: 'Filesystem', d: 'mounted at / or /home' }
        ]
      }
    },
    {
      id: 'ch3-udev',
      ref: '3.5',
      title: 'udev, devtmpfs and hotplug',
      html: `<p>At boot the kernel mounts <strong>devtmpfs</strong> on <code>/dev</code> and creates nodes for devices it knows about. Then <strong>udevd</strong> (systemd-udevd) receives kernel uevents for each device and applies rules to create extra symlinks, set permissions and owners, or run helper programs.</p>
      <p>Rules live in <code>/usr/lib/udev/rules.d</code> (distribution defaults), <code>/etc/udev/rules.d</code> (local overrides) and <code>/run/udev/rules.d</code> (runtime). Files are read in lexical order; local rules with the same number override packaged ones. A rule matches on attributes such as <code>KERNEL</code>, <code>SUBSYSTEM</code>, <code>ATTRS</code> or <code>ENV</code> and assigns <code>NAME</code>, <code>SYMLINK</code>, <code>OWNER</code>, <code>GROUP</code> or <code>MODE</code>.</p>
      <pre><code>$ udevadm info --query=all --name=/dev/sda
$ udevadm monitor --udev --property
$ udevadm test /sys/class/block/sda
$ ls -l /dev/disk/by-uuid/ /dev/disk/by-id/ /dev/disk/by-path/</code></pre>
      <p><code>udevadm monitor</code> is the fastest way to see what happens when you plug in a device. The <code>/dev/disk/by-*</code> directories contain symlinks that give you stable identifiers: filesystem UUIDs, hardware serial numbers, and physical paths.</p>
      <div class="callout tip"><span class="co-ico">✓</span><div><div class="co-title">Prefer by-uuid</div><p>When configuring mounts, use <code>/dev/disk/by-uuid/...</code> or a filesystem label. Device names like sdb depend on probe order and can change.</p></div></div>`
    },
    {
      id: 'ch3-scsi',
      ref: '3.6',
      title: 'SCSI and the kernel storage stack',
      html: `<p>SCSI is more than a physical cable standard; it is a command protocol. Linux models most storage through a SCSI-like stack, even when the hardware is SATA, USB or NVMe. A simplified path looks like this:</p>
      <pre><code>application
   ↓ read()/write()
filesystem (ext4, XFS, ...)
   ↓ block layer
I/O scheduler / device mapper
   ↓
SCSI mid-layer  →  low-level driver (ahci, usb-storage, virtio_scsi, ...)
   ↓
physical device</code></pre>
      <p>USB mass storage is wrapped in SCSI commands. SATA disks use the libata layer, which presents them to the SCSI mid-layer. Virtual machines expose paravirtualized virtio-blk or SCSI devices. This shared model is why the same tools work across very different hardware.</p>
      <p>Raw SCSI commands can be sent through generic devices such as <code>/dev/sg0</code> using tools like <code>sg3_utils</code>. Optical drives, tape drives and disk firmware utilities sometimes need this. For normal filesystem work you never touch the generic device.</p>
      <p>A single device can be reached through multiple interfaces: <code>/dev/sda</code> (block), <code>/dev/sg0</code> (SCSI generic), sysfs attributes and <code>/dev/disk/by-id</code> symlinks. All refer to the same underlying hardware.</p>`
    }
  ],
  commands: [
    { cmd: 'ls -l /dev/sda', desc: 'Show the device type and its major, minor numbers.' },
    { cmd: 'lsblk', desc: 'List block devices, partitions, sizes and mount points as a tree.' },
    { cmd: 'blkid', desc: 'Show filesystem UUIDs, labels and types for block devices.' },
    { cmd: 'cat /proc/devices', desc: 'List registered character and block device major numbers.' },
    { cmd: 'readlink -f /sys/class/block/sda', desc: 'Follow a sysfs class link to the real device path.' },
    { cmd: 'udevadm info --query=all --name=/dev/sda', desc: 'Dump udev properties and attributes for a device.' },
    { cmd: 'udevadm monitor --udev --property', desc: 'Watch hotplug events as devices are added or removed.' },
    { cmd: 'dd if=/dev/zero of=test.img bs=1M count=64 status=progress', desc: 'Create a 64 MiB file of zeros with progress output.' },
    { cmd: 'lsscsi', desc: 'List SCSI devices and their transport (if installed).' }
  ],
  labs: [
    {
      title: 'Trace a device from /dev to /sys',
      goal: 'Follow the kernel\u2019s own links to understand how a device is represented.',
      steps: [
        'Run <code>lsblk -o NAME,MAJ:MIN,SIZE,TYPE,MOUNTPOINT</code> and pick one disk.',
        'Run <code>ls -l /dev/</code> for that disk and note the major:minor pair.',
        'Find the device in <code>/sys/class/block/</code> and run <code>readlink -f</code> on it.',
        'Read <code>size</code>, <code>device/model</code> and <code>queue/rotational</code> in its sysfs directory.',
        'Find its UUID with <code>blkid</code> and locate the matching symlink under <code>/dev/disk/by-uuid/</code>.'
      ]
    },
    {
      title: 'Safe dd and udev observation',
      goal: 'Practise raw I/O on a file, never a real disk.',
      steps: [
        'Create a 32 MiB file with <code>dd if=/dev/zero of=~/dd-test.img bs=1M count=32 status=progress</code>.',
        'Confirm its size with <code>ls -lh</code> and <code>du -h</code>.',
        'Run <code>file ~/dd-test.img</code> and explain why it reports data rather than a filesystem.',
        'If you have permission, run <code>udevadm monitor --udev</code> and plug in a USB device. Observe the add events, then quit with Ctrl-C.',
        'Delete only the test file with <code>rm ~/dd-test.img</code>.'
      ]
    }
  ],
  cards: [
    { front: 'Block device vs character device', back: 'Block devices transfer fixed-size blocks with random access (disks). Character devices transfer byte streams (terminals, serial ports, /dev/null).' },
    { front: 'What do major and minor numbers mean?', back: 'The major number selects the device driver; the minor number selects a particular device or unit handled by that driver.' },
    { front: 'What is sysfs?', back: 'A virtual filesystem mounted at /sys that exposes the kernel device tree, buses, drivers, modules and device attributes.' },
    { front: 'What does dd bs= and count= control?', back: 'bs sets the block size per read/write; count sets how many blocks to copy. Total bytes ≈ bs × count.' },
    { front: 'What is devtmpfs?', back: 'A kernel-maintained filesystem mounted at /dev that automatically contains device nodes for known devices.' },
    { front: 'What does udev do?', back: 'It listens for kernel uevents, then creates or renames device nodes, adds symlinks, and sets permissions based on rules.' }
  ],
  quiz: [
    {
      q: 'In <code>brw-rw---- 1 root disk 8, 0 /dev/sda</code>, what is 8?',
      options: ['The partition number', 'The major number', 'The minor number', 'The block size'],
      answer: 1,
      explain: 'The pair is major, minor. Major 8 selects the sd block driver; minor 0 selects the first disk.'
    },
    {
      q: 'Which directory exposes the kernel\u2019s view of devices and drivers?',
      options: ['/dev', '/etc', '/sys', '/var'],
      answer: 2,
      explain: '/sys (sysfs) is the kernel device tree. /dev contains device nodes, /etc configuration, and /var variable data.'
    },
    {
      q: 'Why can /dev/sdb become /dev/sdc after a reboot?',
      options: [
        'The kernel renumbers all disks randomly.',
        'Device names depend on probe order; use UUIDs or by-id links for stable references.',
        'Only SATA disks change names.',
        'udev deletes unused names.'
      ],
      answer: 1,
      explain: 'The sd driver assigns letters in discovery order. Hardware changes or timing can alter that order, so persistent configuration should use UUID, label or by-id paths.'
    },
    {
      q: 'What is the safest way to test dd?',
      options: [
        'Write to /dev/sda with a small count.',
        'Use a regular file as the output and verify the path first.',
        'Always run it as root.',
        'Use conv=noerror to avoid mistakes.'
      ],
      answer: 1,
      explain: 'Practise on a file in your home directory. dd writes raw blocks and will happily overwrite a partition table if of= points at the wrong device.'
    },
    {
      q: 'What does udev primarily do?',
      options: [
        'Mount all filesystems automatically.',
        'Create and name device nodes in /dev in response to kernel events.',
        'Compile device drivers.',
        'Schedule disk I/O.'
      ],
      answer: 1,
      explain: 'udevd receives uevents and applies rules to manage /dev entries, symlinks and permissions. Mounting is a separate job done by mount/systemd.'
    }
  ]
});
