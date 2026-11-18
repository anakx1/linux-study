window.HLW.chapters.push({
  id: 12,
  title: 'Network File Transfer and Sharing',
  short: 'File transfer',
  track: 'network',
  ref: 'Chapter 12',
  sectionsRef: '12.1–12.8',
  minutes: 40,
  tagline: 'Move data without losing it — or leaking it.',
  blurb: 'Copy files efficiently with rsync, share them with Samba, SSHFS and NFS, and understand the security trade-offs of each option.',
  objectives: [
    'Use scp, sftp and rsync for remote copies, including resumable and incremental transfers.',
    'Explain rsync\u2019s trailing-slash behaviour and use dry-run, exclude and delete safely.',
    'Configure and access SMB/CIFS shares and NFS exports.',
    'Mount a remote filesystem with SSHFS.',
    'Choose an appropriate file-sharing method for a given trust boundary.'
  ],
  sections: [
    {
      id: 'ch12-copy',
      ref: '12.1',
      title: 'Quick copies with scp and sftp',
      html: `<p><code>scp</code> copies files over an SSH connection. It is simple, widely available and encrypted, but it has no incremental transfer: a failed 10 GB copy starts again from zero. <code>sftp</code> gives an interactive session with <code>get</code>, <code>put</code>, <code>ls</code>, <code>cd</code> and <code>mkdir</code>.</p>
      <pre><code>$ scp report.pdf user@host:/tmp/
$ scp -r site/ user@host:/var/www/
$ scp user@host:/var/log/app.log ./
$ sftp user@host
sftp&gt; cd /var/log
sftp&gt; get app.log
sftp&gt; put local.txt</code></pre>
      <p>Both use SSH authentication and honour <code>~/.ssh/config</code> aliases. Quote remote paths that contain spaces. For large or repeated transfers, use rsync instead: it resumes, compares efficiently and can preserve metadata.</p>
      <p>Copying to a remote path with a different owner or mode may require root on the remote side. Do not enable root SSH just to copy files; use a user with appropriate permissions, or copy to a staging directory and move it with sudo.</p>`
    },
    {
      id: 'ch12-rsync',
      ref: '12.2',
      title: 'rsync: incremental, resumable, precise',
      html: `<p><strong>rsync</strong> synchronises directory trees. It compares file metadata and, with <code>--checksum</code>, content hashes, then transfers only differences using a rolling-checksum algorithm. It can resume partial files and preserve permissions, ownership, timestamps and symlinks.</p>
      <pre><code>$ rsync -av src/ dest/
$ rsync -avz src/ user@host:/backup/src/
$ rsync -av --delete src/ dest/
$ rsync -av --dry-run --delete src/ dest/
$ rsync -av --exclude='*.log' --exclude=cache/ src/ dest/
$ rsync -avP big.iso user@host:/data/</code></pre>
      <p>The flags matter: <code>-a</code> archive mode (recursive, symlinks, permissions, times, owner/group when run as root), <code>-v</code> verbose, <code>-z</code> compress in transit, <code>-P</code> progress plus partial resume, <code>--delete</code> remove files at the destination that no longer exist at the source.</p>
      <p><strong>The trailing slash is the classic trap.</strong> <code>rsync -a src/ dest/</code> copies the <em>contents</em> of src into dest. <code>rsync -a src dest/</code> creates <code>dest/src</code>. Decide which you mean and test with <code>--dry-run</code>.</p>
      <pre><code>src/  →  dest/          # contents of src now directly in dest
src   →  dest/src       # src directory itself copied inside dest</code></pre>
      <p>Use <code>--delete</code> only when you truly want a mirror; it can remove data. Exclude patterns are relative to the transfer root, and <code>--exclude-from</code> reads a file. <code>--bwlimit=1M</code> limits bandwidth, <code>--link-dest</code> creates space-efficient snapshot-style backups, and <code>-e ssh</code> selects the remote shell (the default when using a colon path).</p>`,
      diagram: {
        type: 'flow',
        caption: 'rsync transfers only what changed',
        items: [
          { t: 'Source', d: 'files + metadata' },
          { t: 'Compare', d: 'size/time or checksum' },
          { t: 'Delta', d: 'changed blocks only' },
          { t: 'Destination', d: 'updated in place' }
        ]
      }
    },
    {
      id: 'ch12-samba',
      ref: '12.4',
      title: 'Samba and SMB/CIFS',
      html: `<p><strong>Samba</strong> implements the SMB/CIFS protocol used by Windows, macOS and many NAS devices. It can share Linux directories with Windows clients, act as a domain member, or provide a print server. Configuration lives in <code>/etc/samba/smb.conf</code>.</p>
      <pre><code>[global]
   workgroup = WORKGROUP
   server string = Linux file server
   security = user
   map to guest = never

[projects]
   path = /srv/projects
   valid users = @staff
   read only = no
   browseable = yes
   create mask = 0660
   directory mask = 0770</code></pre>
      <p>Create Samba passwords with <code>smbpasswd -a user</code> (separate from Linux passwords). Validate configuration with <code>testparm</code> before restarting <code>smbd</code>. List shares with <code>smbclient -L //server -U user</code>, connect with <code>smbclient //server/projects -U user</code>, and mount with the CIFS helper:</p>
      <pre><code>$ sudo mount -t cifs //server/projects /mnt/projects \\
      -o username=alice,uid=1000,gid=1000,vers=3.0</code></pre>
      <p>Prefer SMB3, which supports encryption and stronger authentication. Do not enable SMB1; it is obsolete and vulnerable. Restrict shares by user/group, use <code>hosts allow</code> where appropriate, and remember that SMB permissions interact with Linux file permissions and ACLs.</p>
      <p>Samba is the right choice when Windows clients need native file sharing. For Linux-to-Linux, NFS or SSHFS is usually simpler.</p>`
    },
    {
      id: 'ch12-sshfs',
      ref: '12.5',
      title: 'SSHFS',
      html: `<p><strong>SSHFS</strong> mounts a remote directory over an existing SSH connection using FUSE. It requires no server-side daemon beyond sshd and inherits SSH authentication and encryption.</p>
      <pre><code>$ mkdir -p ~/mnt/remote
$ sshfs user@host:/var/www ~/mnt/remote
$ ls ~/mnt/remote
$ fusermount -u ~/mnt/remote     # or umount on some systems</code></pre>
      <p>Performance is lower than NFS or SMB because every operation travels over SSH and FUSE, but it is excellent for occasional access, editing remote files, or crossing restrictive networks where only SSH is allowed. Add <code>-o reconnect</code>, <code>-o ServerAliveInterval=15</code> and <code>-o IdentityFile=...</code> for resilience.</p>
      <p>SSHFS mounts are per-user and usually not available at boot without extra configuration. For persistent access, use an <code>fstab</code> entry with <code>sshfs</code> and appropriate options, or mount it from a user systemd unit after the network is online.</p>
      <p>Do not run a database or other latency-sensitive workload on SSHFS. It is a convenience filesystem, not a high-performance shared storage layer.</p>`
    },
    {
      id: 'ch12-nfs',
      ref: '12.6',
      title: 'NFS',
      html: `<p><strong>NFS</strong> is the traditional Unix network filesystem. The server exports directories from <code>/etc/exports</code>; clients mount them as if they were local. NFSv4 uses TCP port 2049 and integrates authentication and ACLs more cleanly than NFSv3.</p>
      <pre><code># /etc/exports
/srv/data  192.168.1.0/24(rw,sync,no_subtree_check)
/backups   client.example.com(ro,sync)</code></pre>
      <pre><code>$ sudo exportfs -ra          # apply exports
$ sudo exportfs -v           # show active exports
$ showmount -e server        # list exports from a client
$ sudo mount -t nfs4 server:/srv/data /mnt/data
$ findmnt /mnt/data</code></pre>
      <p><code>sync</code> makes the server commit writes before replying; it is slower but safer. <code>root_squash</code> (the default) maps remote root to an unprivileged user, preventing a client root from owning server files. <code>no_root_squash</code> is dangerous except for trusted, controlled systems.</p>
      <p>NFS assumes a trusted network unless secured with Kerberos (<code>sec=krb5</code>, <code>krb5i</code>, <code>krb5p</code>). Firewall it carefully, restrict exports by address, and avoid exposing it to the internet. For Linux-to-Linux sharing inside a trusted LAN, it is fast and transparent.</p>`
    },
    {
      id: 'ch12-cloud',
      ref: '12.7–12.8',
      title: 'Cloud storage and choosing a method',
      html: `<p>Cloud storage is usually accessed through provider CLIs, object-storage APIs or tools such as <code>rclone</code>. Object storage (S3-compatible) is not a POSIX filesystem: it has buckets, keys and eventually consistent semantics, not inodes and random writes. Do not mount it and expect a database to work.</p>
      <pre><code>$ rclone config
$ rclone copy ./backup remote:backup --progress
$ rclone sync ./site remote:site --dry-run
$ aws s3 cp file s3://bucket/path/</code></pre>
      <p>Encrypt sensitive data before upload, manage credentials with least privilege, enable versioning where available, and test restores — a backup you cannot restore is not a backup. Watch egress costs and retention policies.</p>
      <p>Choosing a method:</p>
      <ul>
        <li><strong>One-off or occasional copy:</strong> scp or sftp.</li>
        <li><strong>Repeated sync or backup:</strong> rsync over SSH.</li>
        <li><strong>Windows clients:</strong> Samba/CIFS.</li>
        <li><strong>Linux-to-Linux shared storage:</strong> NFS.</li>
        <li><strong>Occasional remote files over SSH-only networks:</strong> SSHFS.</li>
        <li><strong>Durable off-site archive:</strong> object storage with encryption and versioning.</li>
      </ul>
      <p>Every sharing method expands the trust boundary. Ask who can read the data, who can write it, how authentication works, and what happens when a credential leaks.</p>`
    }
  ],
  commands: [
    { cmd: 'scp file user@host:/path/', desc: 'Copy a file to a remote host over SSH.' },
    { cmd: 'scp -r dir/ user@host:/path/', desc: 'Recursively copy a directory over SSH.' },
    { cmd: 'sftp user@host', desc: 'Open an interactive SFTP session.' },
    { cmd: 'rsync -av src/ dest/', desc: 'Archive-sync the contents of src into dest.' },
    { cmd: 'rsync -avz src/ user@host:/backup/', desc: 'Sync to a remote host with compression.' },
    { cmd: 'rsync -av --dry-run --delete src/ dest/', desc: 'Preview a mirror operation without changing anything.' },
    { cmd: 'rsync -avP big.iso user@host:/data/', desc: 'Show progress and resume partial transfers.' },
    { cmd: 'rsync -av --exclude="*.log" src/ dest/', desc: 'Exclude matching files from the transfer.' },
    { cmd: 'sudo testparm', desc: 'Validate the Samba configuration.' },
    { cmd: 'smbclient -L //server -U user', desc: 'List SMB shares on a server.' },
    { cmd: 'sudo mount -t cifs //server/share /mnt/share -o username=user', desc: 'Mount an SMB/CIFS share.' },
    { cmd: 'sshfs user@host:/path ~/mnt/remote', desc: 'Mount a remote directory over SSH using FUSE.' },
    { cmd: 'sudo exportfs -rav', desc: 'Re-export all NFS shares and show them verbosely.' },
    { cmd: 'showmount -e server', desc: 'List NFS exports advertised by a server.' },
    { cmd: 'sudo mount -t nfs4 server:/export /mnt/nfs', desc: 'Mount an NFSv4 export.' },
    { cmd: 'rclone sync ./dir remote:path --dry-run', desc: 'Preview a cloud sync with rclone.' }
  ],
  labs: [
    {
      title: 'Master rsync semantics',
      goal: 'See exactly how trailing slashes, excludes and delete behave — locally and safely.',
      steps: [
        'Create <code>~/rsync-lab/src</code> with two files and a subdirectory; create <code>~/rsync-lab/dest</code>.',
        'Run <code>rsync -av ~/rsync-lab/src/ ~/rsync-lab/dest/</code> and inspect the result.',
        'Delete one source file and run the same command with <code>--dry-run --delete</code>. Then run it for real and confirm the destination mirrors the source.',
        'Try <code>rsync -av ~/rsync-lab/src ~/rsync-lab/dest/</code> and observe the extra directory level.',
        'Add a file matching an exclude pattern and confirm it is skipped.',
        'Write down the difference between source with and without a trailing slash.'
      ]
    },
    {
      title: 'Share and mount locally',
      goal: 'Practise a file-sharing stack with the least risk.',
      steps: [
        'If Samba is installed, run <code>testparm -s</code> and identify the global settings and one share.',
        'If NFS tools are installed, run <code>showmount -e localhost</code> or inspect <code>/etc/exports</code>.',
        'If FUSE and SSH are available, run <code>sshfs localhost:$HOME ~/mnt/local</code> after creating the mount point. Browse a file, then unmount.',
        'Compare the mount output of <code>findmnt</code> for the SSHFS mount with a local filesystem.',
        'List one advantage and one risk of each sharing method you tried.'
      ]
    }
  ],
  cards: [
    { front: 'What does the trailing slash mean in rsync?', back: 'src/ copies the contents of src into dest. src copies the directory itself, creating dest/src.' },
    { front: 'What does rsync -a preserve?', back: 'Recursive copy plus symlinks, permissions, timestamps, owner/group (when permitted), and device/special files.' },
    { front: 'Is scp resumable?', back: 'No. A failed scp transfer restarts. Use rsync -P or sftp for resumable or incremental transfers.' },
    { front: 'Samba vs NFS', back: 'Samba implements SMB/CIFS for Windows interoperability. NFS is the native Unix/Linux network filesystem and is usually simpler for Linux-to-Linux.' },
    { front: 'What is root_squash in NFS?', back: 'It maps the client\u2019s root user to an unprivileged server user, preventing a remote root from owning or modifying server files as root.' },
    { front: 'How does SSHFS work?', back: 'It mounts a remote directory through an SSH connection using FUSE, with no extra server daemon beyond sshd.' }
  ],
  quiz: [
    {
      q: 'You want dest to contain exactly the same files as src, including removing extras. Which command?',
      options: ['rsync -av src/ dest/', 'rsync -av --delete src/ dest/', 'scp -r src/ dest/', 'cp -a src/ dest/'],
      answer: 1,
      explain: '--delete removes destination files that are absent from the source, turning the transfer into a mirror. Always preview with --dry-run first.'
    },
    {
      q: 'What is the difference between <code>rsync -a src/ dest/</code> and <code>rsync -a src dest/</code>?',
      options: [
        'There is no difference',
        'The first copies the contents of src; the second creates dest/src',
        'The second deletes files',
        'The first compresses data'
      ],
      answer: 1,
      explain: 'The trailing slash on the source means "contents of". Without it, the source directory itself is placed inside the destination.'
    },
    {
      q: 'Which protocol should you prefer for a Windows client accessing a Linux share?',
      options: ['NFSv3', 'SMB3 via Samba', 'FTP', 'Telnet'],
      answer: 1,
      explain: 'SMB is native to Windows. SMB3 adds encryption and stronger authentication; SMB1 should be disabled.'
    },
    {
      q: 'What does NFS root_squash do?',
      options: [
        'Compresses root-owned files',
        'Maps remote root to an unprivileged user on the server',
        'Disables all writes',
        'Encrypts NFS traffic'
      ],
      answer: 1,
      explain: 'root_squash prevents a client root from acting as root on the server. Encryption requires Kerberos (sec=krb5p).'
    },
    {
      q: 'When is SSHFS a good choice?',
      options: [
        'A high-throughput database volume',
        'Occasional remote file access over a network where only SSH is allowed',
        'A Windows file share',
        'Replacing a local disk'
      ],
      answer: 1,
      explain: 'SSHFS is convenient and encrypted but slower than NFS/SMB. Avoid latency-sensitive workloads on it.'
    }
  ]
});
