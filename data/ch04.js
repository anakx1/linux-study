window.HLW.chapters.push({
  id: 4,
  title: 'Disks and Filesystems',
  short: 'Disks & filesystems',
  track: 'storage',
  ref: 'Chapter 4',
  sectionsRef: '4.1–4.6',
  minutes: 55,
  tagline: 'From raw sectors to named files.',
  blurb: 'Partition disks, create and mount filesystems, survive /etc/fstab, add swap, grow LVM volumes, and look inside the inode structure that makes Unix filesystems work.',
  objectives: [
    'Read partition tables and explain the difference between MBR and GPT.',
    'Create, mount, unmount and persistently configure filesystems.',
    'Use UUIDs and /etc/fstab safely, and repair filesystems with fsck.',
    'Add swap space and extend storage with LVM.',
    'Explain inodes, hard links, block allocation and journaling.'
  ],
  sections: [
    {
      id: 'ch4-partitions',
      ref: '4.1',
      title: 'Partitioning a disk',
      html: `<p>A disk is a sequence of sectors. A <strong>partition table</strong> divides that sequence into regions, each of which can hold a filesystem, swap space, LVM physical volume or something else. The kernel exposes partitions as separate block devices: <code>/dev/sda1</code>, <code>/dev/nvme0n1p2</code>.</p>
      <p>Two table formats matter:</p>
      <ul>
        <li><strong>MBR</strong> (DOS): four primary partitions, extended partitions for more. Uses 32-bit LBA, limiting disks to about 2 TiB. Still common on older BIOS systems.</li>
        <li><strong>GPT</strong>: 64-bit LBA, many partitions (typically 128), redundant headers and CRC checks, and a protective MBR for old tools. Required for UEFI boot in practice.</li>
      </ul>
      <pre><code>$ lsblk
$ sudo fdisk -l /dev/sda
$ sudo parted /dev/sda print
$ sudo gdisk -l /dev/sda     # GPT-aware alternative</code></pre>
      <p><code>fdisk</code> is interactive; <code>parted</code> can also resize and create tables non-interactively; <code>gdisk</code> is GPT-specific. All of them write to the disk immediately when you confirm — there is no undo. Back up important data and double-check the device name before changing a table.</p>
      <div class="callout warn"><span class="co-ico">!</span><div><div class="co-title">The kernel may still use the old table</div><p>After changing partitions, the kernel normally re-reads the table. If it does not, a reboot (or <code>partprobe</code>) is needed. Never create a filesystem on a partition that is still mounted.</p></div></div>`
    },
    {
      id: 'ch4-filesystems',
      ref: '4.2.1–4.2.4',
      title: 'Creating and mounting filesystems',
      html: `<p>A filesystem imposes structure on a partition: directories, files, metadata, free-space maps and a journal. Linux supports many types. <strong>ext4</strong> is the mature general-purpose default on many distributions; <strong>XFS</strong> excels at large files and parallel I/O; <strong>Btrfs</strong> adds snapshots, checksums and subvolumes; <strong>VFAT</strong> and <strong>exFAT</strong> are for interoperability with other operating systems.</p>
      <pre><code>$ sudo mkfs.ext4 /dev/sdb1
$ sudo mkfs.xfs /dev/sdb2
$ sudo mount /dev/sdb1 /mnt/data
$ mount | grep sdb1
$ findmnt /mnt/data
$ sudo umount /mnt/data</code></pre>
      <p><code>mkfs</code> destroys the existing filesystem on the target. <code>mount</code> attaches a filesystem to a directory (the mount point); the old contents of that directory are hidden while the mount is active. <code>umount</code> detaches it. A “target is busy” error means some process still has files open there; use <code>lsof +D /mnt/data</code> or <code>fuser -vm</code> to find it.</p>
      <p>Filesystem identity should not depend on device names. Every ext4/XFS filesystem has a <strong>UUID</strong>; <code>blkid</code> shows it. Mounts can use <code>UUID=...</code> or <code>LABEL=...</code> in <code>/etc/fstab</code>, and udev creates convenience links under <code>/dev/disk/by-uuid</code>.</p>
      <p>The kernel caches disk data in unused RAM. Writes are buffered and flushed periodically, which makes I/O fast but means a power loss can lose recent writes. Journaling protects filesystem consistency, not your unsaved application data. <code>sync</code> forces dirty data out; <code>fsync()</code> does it for one file.</p>`
    },
    {
      id: 'ch4-fstab',
      ref: '4.2.6–4.2.9',
      title: 'Mount options and /etc/fstab',
      html: `<p><code>/etc/fstab</code> describes filesystems to mount at boot and on demand. Each line has six fields:</p>
      <pre><code>UUID=xxxx  /home  ext4  defaults,noatime  0  2
tmpfs      /tmp   tmpfs mode=1777,size=1G   0  0
server:/export /mnt/nfs nfs4 rw,soft         0  0</code></pre>
      <ol>
        <li><strong>Device</strong>: UUID, label, device path or remote export.</li>
        <li><strong>Mount point</strong>.</li>
        <li><strong>Filesystem type</strong> (or <code>auto</code>).</li>
        <li><strong>Options</strong>: <code>defaults</code>, <code>ro</code>, <code>rw</code>, <code>noatime</code>, <code>nosuid</code>, <code>nodev</code>, <code>noexec</code>, <code>nofail</code>.</li>
        <li><strong>Dump</strong>: legacy backup flag, almost always 0.</li>
        <li><strong>Fsck pass</strong>: 1 for root, 2 for other local filesystems, 0 to skip.</li>
      </ol>
      <p>Test new entries with <code>sudo mount -a</code> before rebooting. A bad fstab entry can leave the machine in emergency mode. Use <code>nofail</code> for removable or non-essential mounts so boot continues when they are absent.</p>
      <pre><code>$ sudo mount -o remount,ro /home
$ findmnt --verify
$ systemctl daemon-reload</code></pre>
      <p>Options can also be changed temporarily with <code>mount -o remount</code>. <strong>systemd</strong> can mount filesystems from <code>.mount</code> units and <code>/etc/fstab</code>; <strong>autofs</strong> mounts on first access, which is useful for network shares and removable media.</p>`
    },
    {
      id: 'ch4-capacity',
      ref: '4.2.10–4.2.12',
      title: 'Capacity, checking and special filesystems',
      html: `<p><code>df -h</code> reports filesystem-level capacity; <code>df -i</code> reports inode usage. <code>du -sh dir</code> totals the space used by files under a directory. They can disagree because deleted files still held open consume space, and because <code>df</code> counts filesystem overhead and reserved blocks.</p>
      <pre><code>$ df -h
$ df -i
$ du -sh /var/log
$ sudo du -x -h --max-depth=1 / | sort -h</code></pre>
      <p>ext4 reserves about 5% of blocks for root by default, which keeps daemons working when the disk fills. <code>tune2fs -m 1 /dev/sdb1</code> reduces that reserve on large data disks. <code>tune2fs -l</code> dumps filesystem parameters.</p>
      <p>Consistency checks are performed by <code>fsck</code>, which dispatches to <code>e2fsck</code> for ext filesystems or <code>xfs_repair</code> for XFS. Never run a repair on a mounted filesystem; unmount it or boot from rescue media. A journal makes a full check unnecessary on every boot, but periodic checks are still useful on ext4.</p>
      <p>Some filesystems are virtual and have no backing device: <code>/proc</code> (process and kernel state), <code>/sys</code> (devices), <code>tmpfs</code> (RAM-backed files that vanish on reboot) and <code>devtmpfs</code> (device nodes). They are created by the kernel and are not places to store persistent data.</p>`,
      callout: {
        type: 'tip',
        title: 'Find what filled the disk',
        text: 'Start with df -h to find the filesystem, then du -x -h --max-depth=1 on that mount, drilling down. Check deleted-but-open files with lsof +L1, and reserve space for logs so a full disk never stops you from logging in.'
      }
    },
    {
      id: 'ch4-swap',
      ref: '4.3',
      title: 'Swap space',
      html: `<p>Swap extends virtual memory onto disk. When memory pressure rises, the kernel can move inactive pages out and bring them back on demand. Swap is not a substitute for enough RAM — it is a safety valve and a way to hibernate.</p>
      <pre><code># partition
$ sudo mkswap /dev/sdb2
$ sudo swapon /dev/sdb2
$ swapon --show
$ free -h

# file
$ sudo fallocate -l 2G /swapfile
$ sudo chmod 600 /swapfile
$ sudo mkswap /swapfile
$ sudo swapon /swapfile</code></pre>
      <p>To make swap persistent, add an entry to <code>/etc/fstab</code> with type <code>swap</code> and options <code>sw</code>. A swap file needs to be on a local filesystem with enough contiguous space; do not put it on a network filesystem.</p>
      <p>Sizing is workload-dependent. A common starting point is equal to RAM for small machines, smaller for large-memory servers, and at least enough for hibernation if you use it. Monitor with <code>free -h</code>, <code>vmstat</code> and <code>si/so</code> columns; heavy sustained swapping indicates memory pressure, not a healthy configuration.</p>
      <div class="callout note"><span class="co-ico">i</span><div><div class="co-title">Swappiness</div><p><code>vm.swappiness</code> tunes how aggressively the kernel reclaims anonymous pages. It is a trade-off, not a switch; measure before changing it.</p></div></div>`
    },
    {
      id: 'ch4-lvm',
      ref: '4.4',
      title: 'Logical Volume Manager',
      html: `<p>LVM inserts a flexible layer between physical disks and filesystems. <strong>Physical volumes</strong> (PVs) are disks or partitions. <strong>Volume groups</strong> (VGs) pool PVs into a storage pool. <strong>Logical volumes</strong> (LVs) are virtual partitions carved from the pool; they can grow, shrink (with care), snapshot and span disks.</p>
      <pre><code>$ sudo pvcreate /dev/sdb /dev/sdc
$ sudo vgcreate data /dev/sdb /dev/sdc
$ sudo lvcreate -L 100G -n home data
$ sudo lvs
$ sudo lvextend -L +50G /dev/data/home
$ sudo resize2fs /dev/data/home   # ext4
$ sudo xfs_growfs /home           # XFS (mounted)</code></pre>
      <p>LVs appear under <code>/dev/mapper/data-home</code> and <code>/dev/data/home</code>. Device-mapper is the kernel mechanism; LVM is a user-space manager on top. Snapshots use copy-on-write and are useful for consistent backups, but they are not backups by themselves.</p>
      <p>LVM is common on servers and default desktop installers. It complicates recovery — you may need <code>vgchange -ay</code> to activate volumes before mounting — but it makes capacity changes far easier than repartitioning.</p>`,
      diagram: {
        type: 'layers',
        caption: 'LVM stacks a flexible volume layer above physical devices',
        items: [
          { t: 'Filesystem', d: 'ext4 / XFS mounted at /home', cls: 'hot' },
          { t: 'Logical volume', d: '/dev/data/home — resizable' },
          { t: 'Volume group', d: 'data — pool of physical extents', cls: 'warm' },
          { t: 'Physical volumes', d: '/dev/sdb + /dev/sdc' },
          { t: 'Disks / partitions', d: 'raw block devices' }
        ]
      }
    },
    {
      id: 'ch4-inodes',
      ref: '4.6',
      title: 'Inside a traditional filesystem',
      html: `<p>A Unix filesystem separates a file's <strong>name</strong> from its <strong>metadata</strong>. The metadata lives in an <strong>inode</strong>: type, permissions, owner, timestamps, size and pointers to data blocks. A directory is simply a table mapping names to inode numbers.</p>
      <pre><code>$ ls -li notes.txt
$ stat notes.txt
$ df -i</code></pre>
      <p>This design explains hard links. Two names with the same inode number are equal references to one file; the inode's <strong>link count</strong> records how many names point to it. Deleting a name decrements the count; the data is freed only when the count reaches zero and no process has the file open.</p>
      <p>Data blocks are allocated from block groups. The superblock records the filesystem geometry; backup superblocks allow recovery. Modern ext4 uses extents instead of one pointer per block, which reduces metadata for large files.</p>
      <p><strong>Journaling</strong> writes metadata changes to a journal before committing them, so after a crash the filesystem can replay or discard incomplete transactions and avoid a full scan. It does not guarantee that file contents are consistent — applications must still use fsync and atomic-rename patterns for durable writes.</p>
      <p>You rarely manipulate inodes directly, but the model explains “No space left on device” when <code>df -h</code> shows free space: the inode table may be exhausted. It also explains why deleting a huge file does not free space while a process still holds it open.</p>`
    }
  ],
  commands: [
    { cmd: 'lsblk -f', desc: 'Show block devices with filesystem type, label, UUID and mount point.' },
    { cmd: 'sudo fdisk -l', desc: 'List partition tables and partitions for all disks.' },
    { cmd: 'sudo parted /dev/sda print', desc: 'Print a disk\u2019s partition table and geometry.' },
    { cmd: 'sudo mkfs.ext4 /dev/sdb1', desc: 'Create an ext4 filesystem — destroys existing data on the partition.' },
    { cmd: 'sudo mount /dev/sdb1 /mnt/data', desc: 'Attach a filesystem to a mount point.' },
    { cmd: 'findmnt /mnt/data', desc: 'Show the mount source, type and options for a path.' },
    { cmd: 'blkid /dev/sdb1', desc: 'Print the UUID, label and filesystem type.' },
    { cmd: 'sudo mount -a', desc: 'Mount everything in /etc/fstab that is not already mounted; test new entries.' },
    { cmd: 'df -h', desc: 'Show filesystem usage in human-readable units.' },
    { cmd: 'df -i', desc: 'Show inode usage — important when small files exhaust inodes.' },
    { cmd: 'du -sh /var/log', desc: 'Total apparent disk usage of a directory.' },
    { cmd: 'sudo fsck /dev/sdb1', desc: 'Check and repair a filesystem; must be unmounted for repair.' },
    { cmd: 'sudo swapon --show', desc: 'List active swap areas and their sizes and priorities.' },
    { cmd: 'sudo pvs && sudo vgs && sudo lvs', desc: 'Summarise LVM physical volumes, volume groups and logical volumes.' },
    { cmd: 'sudo lvextend -L +10G /dev/data/home', desc: 'Grow a logical volume by 10 GiB.' },
    { cmd: 'sudo tune2fs -l /dev/sdb1', desc: 'Inspect ext filesystem parameters, including reserved block percentage.' }
  ],
  labs: [
    {
      title: 'Read a real filesystem',
      goal: 'Use read-only commands to understand the storage layout of your machine.',
      steps: [
        'Run <code>lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT</code>. Identify disks, partitions, LVM or crypto layers.',
        'Run <code>findmnt</code> and find the options for <code>/</code> and <code>/home</code>.',
        'Compare <code>df -h</code> with <code>df -i</code>. Are inodes or bytes closer to exhaustion?',
        'Pick a file and run <code>stat</code> and <code>ls -li</code>. Note the inode number and link count.',
        'Find a directory with a large <code>du</code> total, then drill down one level with <code>--max-depth=1</code>.'
      ]
    },
    {
      title: 'Create and inspect a filesystem image',
      goal: 'Practise mkfs and tune2fs without touching a physical disk.',
      steps: [
        'Create a 64 MiB image: <code>dd if=/dev/zero of=~/fs.img bs=1M count=64</code>.',
        'Create ext4 on the image: <code>mkfs.ext4 ~/fs.img</code> (answer yes if prompted).',
        'Inspect it with <code>tune2fs -l ~/fs.img</code> and <code>blkid ~/fs.img</code>.',
        'Use <code>debugfs -R "ls -l /" ~/fs.img</code> to look inside without mounting.',
        'If you have root and a loop device, mount it read-only and compare <code>df</code> output; unmount afterwards.',
        'Delete the image only after unmounting.'
      ]
    }
  ],
  cards: [
    { front: 'MBR vs GPT', back: 'MBR: 4 primary partitions, 2 TiB limit, legacy BIOS. GPT: 64-bit LBA, many partitions, redundant headers and CRC, used with UEFI.' },
    { front: 'What are the six fields of /etc/fstab?', back: 'Device, mount point, filesystem type, mount options, dump flag, fsck pass.' },
    { front: 'What is an inode?', back: 'The metadata record for a file: type, permissions, owner, size, timestamps, link count and block pointers. Names live in directories and point to inodes.' },
    { front: 'What does a mount point do?', back: 'It attaches a filesystem into the directory tree, hiding the previous contents of that directory until it is unmounted.' },
    { front: 'Reasons df and du disagree', back: 'Deleted files held open, filesystem overhead/reserved blocks, sparse files, bind mounts, and different block accounting.' },
    { front: 'PV, VG, LV', back: 'Physical volume (disk/partition) → volume group (pool) → logical volume (resizable virtual partition) → filesystem.' },
    { front: 'What does journaling protect?', back: 'Filesystem metadata consistency after a crash. It does not guarantee application data is flushed or transactionally consistent.' }
  ],
  quiz: [
    {
      q: 'Which command is the safest way to preview a new /etc/fstab entry?',
      options: ['reboot', 'mount -a', 'mkfs', 'fsck -y'],
      answer: 1,
      explain: 'mount -a mounts everything in fstab that is not already mounted. Run it before rebooting so a typo surfaces while the system is still up.'
    },
    {
      q: 'You delete a 10 GB log file but df still shows the disk full. What is the most likely cause?',
      options: [
        'The filesystem is read-only.',
        'A process still has the deleted file open, so its blocks are not freed.',
        'df caches old values forever.',
        'The file was compressed.'
      ],
      answer: 1,
      explain: 'The directory entry is gone but the inode and blocks survive until the last open file descriptor closes. Find it with lsof +L1 and restart or signal the process.'
    },
    {
      q: 'What is the correct order for extending an ext4 filesystem on LVM?',
      options: [
        'resize2fs, then lvextend',
        'lvextend the LV, then resize2fs the filesystem',
        'mkfs, then mount',
        'pvcreate, then reboot'
      ],
      answer: 1,
      explain: 'First grow the block device (logical volume), then grow the filesystem into the new space. XFS uses xfs_growfs instead of resize2fs.'
    },
    {
      q: 'What does the fifth field of an fstab line control?',
      options: ['Filesystem type', 'Mount options', 'Dump/backup flag', 'Fsck pass order'],
      answer: 2,
      explain: 'The fields are device, mount point, type, options, dump, pass. Dump is a legacy backup flag; pass controls fsck order.'
    },
    {
      q: 'Why should fsck not be run on a mounted filesystem?',
      options: [
        'It is too slow.',
        'Repairs can race with live kernel writes and corrupt the filesystem.',
        'It only works on XFS.',
        'It deletes all files.'
      ],
      answer: 1,
      explain: 'A mounted filesystem is being modified. Repair tools assume exclusive access; unmount it or boot rescue media before repairing.'
    },
    {
      q: 'What is a key advantage of LVM?',
      options: [
        'It makes disks physically faster.',
        'It pools storage and allows logical volumes to be resized and snapshotted.',
        'It replaces the need for a filesystem.',
        'It encrypts data automatically.'
      ],
      answer: 1,
      explain: 'LVM abstracts physical devices into volume groups and logical volumes, making resizing and snapshots practical. Encryption requires LUKS separately.'
    }
  ]
});
